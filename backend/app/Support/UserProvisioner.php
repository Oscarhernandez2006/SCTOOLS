<?php

namespace App\Support;

use App\Models\Application;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Orquesta el aprovisionamiento de un usuario de la suite hacia las apps
 * externas. Lee el rol y los módulos por app desde el pivote application_user
 * y los refleja en cada aplicación mediante {@see ProvisioningClient}.
 */
class UserProvisioner
{
    public function __construct(private readonly ProvisioningClient $client)
    {
    }

    /**
     * Refleja el usuario (alta/edición) en todas las apps aprovisionables a las
     * que tiene acceso. Envía contraseña solo si se proporciona en texto plano.
     *
     * @return array<string,bool> Resultado por slug de aplicación.
     */
    public function syncUser(User $user, ?string $plainPassword = null): array
    {
        $result = [];

        foreach ($user->applications()->get() as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $result[$application->slug] = $this->syncApp($user, $application, $plainPassword);
        }

        return $result;
    }

    /** Refleja un usuario en una sola app (upsert + estado + permisos). */
    public function syncApp(User $user, Application $application, ?string $plainPassword = null): bool
    {
        $active = (bool) $user->is_active;
        $perms = $this->pivotPermissions($application);

        $payload = array_filter([
            'cedula' => $user->cedula,
            'nombre' => $user->name,
            'email' => $user->email,
            'rol' => $this->appRole($application),
            // Solo se manda la lista global cuando NO es por compañía (evita
            // pisar los módulos por compañía en apps multi-compañía como Sigcom).
            'permisos' => $perms['type'] === 'array' ? $perms['perms'] : null,
            'activo' => $active,
            'password' => $plainPassword,
        ], fn ($v) => $v !== null);

        $ok = $this->client->upsertUser($application, $payload);

        // El flag "bloqueado por la suite" es explícito: se activa al desactivar.
        $ok = $this->client->setEstado($application, $user->cedula, $active, ! $active) && $ok;

        // Apps multi-compañía (Sigcom): asigna acceso + código de vendedor y
        // módulos por cada compañía habilitada; quita las compañías deshabilitadas.
        if ($perms['type'] === 'byCompany') {
            $enabled = $perms['enabled'];

            $remote = $this->client->getUser($application, $user->cedula);
            $current = [];
            if ($remote && ! empty($remote['companies'])) {
                foreach ($remote['companies'] as $c) {
                    $current[] = (string) ($c['companyId'] ?? '');
                }
            }
            foreach ($current as $companyId) {
                if ($companyId !== '' && ! in_array($companyId, $enabled, true)) {
                    $ok = $this->client->removeCompany($application, $user->cedula, $companyId) && $ok;
                }
            }

            foreach ($enabled as $companyId) {
                $ok = $this->client->assignCompany(
                    $application,
                    $user->cedula,
                    $companyId,
                    $perms['sellers'][$companyId] ?? null,
                ) && $ok;
                $ok = $this->client->setCompanyPermisos(
                    $application,
                    $user->cedula,
                    $companyId,
                    $perms['companies'][$companyId] ?? [],
                ) && $ok;
            }
        }

        return $ok;
    }

    /** Propaga solo el estado (activo/bloqueo) a las apps aprovisionables. */
    public function syncState(User $user): array
    {
        $active = (bool) $user->is_active;
        $result = [];

        foreach ($user->applications()->get() as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $result[$application->slug] = $this->client->setEstado(
                $application,
                $user->cedula,
                $active,
                ! $active,
            );
        }

        return $result;
    }

    /** Propaga solo rol/permisos de una app concreta. */
    public function syncPermissions(User $user, Application $application): bool
    {
        if (! $this->client->isProvisionable($application)) {
            return false;
        }

        return $this->client->setPermisos(
            $application,
            $user->cedula,
            $this->appRole($application),
            $this->appPermissions($application) ?? [],
        );
    }

    /** Cambia la contraseña en todas las apps aprovisionables. */
    public function syncPassword(User $user, string $plainPassword): array
    {
        $result = [];

        foreach ($user->applications()->get() as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $result[$application->slug] = $this->client->setPassword(
                $application,
                $user->cedula,
                $plainPassword,
            );
        }

        return $result;
    }

    /** Desactiva y bloquea al usuario en todas las apps (p. ej. al eliminarlo). */
    public function blockEverywhere(User $user): array
    {
        $result = [];

        foreach ($user->applications()->get() as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $result[$application->slug] = $this->client->setEstado(
                $application,
                $user->cedula,
                false,
                true,
            );
        }

        return $result;
    }

    /**
     * Bloquea al usuario en apps concretas (p. ej. cuando se le quita el acceso
     * a una app pero sigue activo en la suite).
     *
     * @param  array<int>  $applicationIds
     */
    public function blockApplications(User $user, array $applicationIds): array
    {
        $result = [];

        if (empty($applicationIds)) {
            return $result;
        }

        $apps = Application::query()->whereIn('id', $applicationIds)->get();

        foreach ($apps as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $result[$application->slug] = $this->client->setEstado(
                $application,
                $user->cedula,
                false,
                true,
            );
        }

        return $result;
    }

    /**
     * Importa los usuarios existentes en las apps aprovisionables hacia la
     * suite, reflejando su rol y permisos por app. Idempotente: cruza por
     * cédula, no duplica usuarios ni accesos, y NO pisa la configuración por
     * app ya definida en la suite (solo rellena lo vacío).
     *
     * @return array<string,array<string,int|string>>
     */
    public function importFromApps(): array
    {
        $summary = [];

        $apps = Application::query()
            ->whereIn('slug', (array) config('services.provisioning.apps', []))
            ->get();

        foreach ($apps as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $users = $this->client->listUsers($application);
            if ($users === null) {
                $summary[$application->slug] = ['error' => 'no disponible'];
                continue;
            }

            $created = 0;
            $linked = 0;

            foreach ($users as $u) {
                $cedula = trim((string) ($u['cedula'] ?? ''));
                if ($cedula === '') {
                    continue;
                }

                $suiteUser = User::query()->where('cedula', $cedula)->first();
                $email = $this->safeEmail($u['email'] ?? null, $suiteUser?->id);

                if (! $suiteUser) {
                    $suiteUser = User::create([
                        'name' => ($u['nombre'] ?? '') ?: $cedula,
                        'cedula' => $cedula,
                        'email' => $email,
                        // Sin acceso al hash real: contraseña aleatoria; el
                        // usuario entra por SSO o el admin la restablece.
                        'password' => Str::random(40),
                        'is_active' => (bool) ($u['activo'] ?? true),
                        'is_admin' => false,
                    ]);
                    $created++;
                } else {
                    if (empty($suiteUser->name) && ! empty($u['nombre'])) {
                        $suiteUser->name = $u['nombre'];
                    }
                    if (empty($suiteUser->email) && $email) {
                        $suiteUser->email = $email;
                    }
                    $suiteUser->save();
                    $linked++;
                }

                $this->linkAppFromImport($suiteUser, $application, $u);
            }

            $summary[$application->slug] = [
                'created' => $created,
                'linked' => $linked,
                'total' => count($users),
            ];
        }

        return $summary;
    }

    /**
     * Adjunta/actualiza el pivote reflejando el rol y permisos ACTUALES que
     * trae la app (fuente de verdad de lo que hay hoy allá). Conserva las
     * habilidades granulares de la suite.
     *
     * @param  array<string,mixed>  $remote
     */
    private function linkAppFromImport(User $user, Application $application, array $remote): void
    {
        $existing = $user->applications()->where('applications.id', $application->id)->first();
        $this->writePivotFromRemote($user, $application, $remote, $existing?->pivot);
    }

    /** Evita chocar con el email único de otro usuario distinto. */
    private function safeEmail(?string $email, ?int $ignoreUserId): ?string
    {
        $email = $email ? trim($email) : null;
        if (! $email) {
            return null;
        }

        $exists = User::query()
            ->where('email', $email)
            ->when($ignoreUserId, fn ($q) => $q->where('id', '!=', $ignoreUserId))
            ->exists();

        return $exists ? null : $email;
    }

    /**
     * Refresca UN usuario desde las apps externas: consulta cada app donde
     * tiene acceso y refleja el rol/permisos ACTUALES (los permisos también se
     * pueden cambiar desde las apps). Idempotente, cruza por cédula.
     */
    public function refreshUserFromApps(User $user): void
    {
        foreach ($user->applications()->get() as $application) {
            if (! $this->client->isProvisionable($application)) {
                continue;
            }

            $remote = $this->client->getUser($application, $user->cedula);
            if ($remote === null) {
                continue;
            }

            $this->writePivotFromRemote($user, $application, $remote, $application->pivot);
        }
    }

    /**
     * Adjunta/actualiza el pivote reflejando el rol y permisos ACTUALES de la
     * app. Si la app trae compañías (Sigcom), guarda los módulos por compañía;
     * si no, una lista plana. Conserva las habilidades granulares de la suite.
     *
     * @param  array<string,mixed>  $remote
     */
    private function writePivotFromRemote(User $user, Application $application, array $remote, $existingPivot = null): void
    {
        $companies = $remote['companies'] ?? [];

        if (! empty($companies) && is_array($companies)) {
            $byCompany = [];
            $sellers = [];
            $ids = [];
            foreach ($companies as $c) {
                $companyId = (string) ($c['companyId'] ?? '');
                if ($companyId === '') {
                    continue;
                }
                $byCompany[$companyId] = array_values((array) ($c['permisos'] ?? []));
                if (! empty($c['sellerCode'])) {
                    $sellers[$companyId] = (string) $c['sellerCode'];
                }
                $ids[] = $companyId;
            }
            $appPermissions = json_encode([
                'byCompany' => $byCompany,
                'sellers' => $sellers,
                'companies' => $ids,
            ]);
        } else {
            $appPermissions = json_encode(array_values((array) ($remote['permisos'] ?? [])));
        }

        $user->applications()->syncWithoutDetaching([
            $application->id => [
                'abilities' => $existingPivot?->abilities ?? json_encode(['view']),
                'app_role' => ($remote['rol'] ?? null) ?: null,
                'app_permissions' => $appPermissions,
            ],
        ]);
    }

    private function appRole(Application $application): ?string
    {
        $role = $application->pivot->app_role ?? null;

        return $role !== null && $role !== '' ? (string) $role : null;
    }

    /** @return array<int,string>|null Null si está vacío: no toca los módulos de la app. */
    private function appPermissions(Application $application): ?array
    {
        $raw = $application->pivot->app_permissions ?? null;
        if ($raw === null) {
            return null;
        }
        $value = is_array($raw) ? $raw : json_decode((string) $raw, true);
        if (! is_array($value) || count($value) === 0) {
            return null;
        }

        return array_values($value);
    }

    /**
     * Interpreta el pivote app_permissions: lista plana (Sigcompro) o por
     * compañía (Sigcom, forma {"byCompany": {"3": [...], "8": [...]}}).
     *
     * @return array{type:string, perms?:array<int,string>|null, companies?:array<string,array<int,string>>}
     */
    private function pivotPermissions(Application $application): array
    {
        $raw = $application->pivot->app_permissions ?? null;
        $value = is_array($raw) ? $raw : json_decode((string) $raw, true);

        if (is_array($value) && array_key_exists('byCompany', $value)) {
            $companies = [];
            foreach ((array) $value['byCompany'] as $companyId => $perms) {
                $companies[(string) $companyId] = array_values((array) $perms);
            }
            $sellers = [];
            foreach ((array) ($value['sellers'] ?? []) as $companyId => $code) {
                $sellers[(string) $companyId] = (string) $code;
            }
            $enabled = array_values(array_map('strval', (array) ($value['companies'] ?? array_keys($companies))));

            return [
                'type' => 'byCompany',
                'companies' => $companies,
                'sellers' => $sellers,
                'enabled' => $enabled,
            ];
        }

        $arr = is_array($value) ? array_values($value) : [];

        // Lista vacía => null: no se pisan los módulos existentes de la app.
        return ['type' => 'array', 'perms' => count($arr) ? $arr : null];
    }
}

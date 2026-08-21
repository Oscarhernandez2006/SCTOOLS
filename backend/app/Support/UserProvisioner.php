<?php

namespace App\Support;

use App\Models\Application;
use App\Models\User;

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

    /** Refleja un usuario en una sola app (upsert + estado). */
    public function syncApp(User $user, Application $application, ?string $plainPassword = null): bool
    {
        $active = (bool) $user->is_active;

        $payload = array_filter([
            'cedula' => $user->cedula,
            'nombre' => $user->name,
            'email' => $user->email,
            'rol' => $this->appRole($application),
            'permisos' => $this->appPermissions($application),
            'activo' => $active,
            'password' => $plainPassword,
        ], fn ($v) => $v !== null);

        $ok = $this->client->upsertUser($application, $payload);

        // El flag "bloqueado por la suite" es explícito: se activa al desactivar.
        $ok = $this->client->setEstado($application, $user->cedula, $active, ! $active) && $ok;

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

    private function appRole(Application $application): ?string
    {
        $role = $application->pivot->app_role ?? null;

        return $role !== null && $role !== '' ? (string) $role : null;
    }

    /** @return array<int,string>|null */
    private function appPermissions(Application $application): ?array
    {
        $raw = $application->pivot->app_permissions ?? null;
        if ($raw === null) {
            return null;
        }
        if (is_array($raw)) {
            return array_values($raw);
        }

        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? array_values($decoded) : null;
    }
}

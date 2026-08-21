<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\ProvisioningClient;
use App\Support\UserProvisioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UserAccessController extends Controller
{
    public function __construct(
        private readonly UserProvisioner $provisioner,
        private readonly ProvisioningClient $client,
    ) {
    }

    /**
     * Ensure the authenticated user is an administrator.
     */
    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()->is_admin, Response::HTTP_FORBIDDEN, 'No autorizado');
    }

    /**
     * List all users (for the permissions admin screen).
     */
    public function users(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name', 'cedula', 'email', 'is_active', 'is_admin']);

        return response()->json($users);
    }

    /**
     * List the full applications catalog.
     */
    public function applications(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $applications = Application::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'slug', 'name', 'description', 'icon', 'category', 'color', 'type', 'is_active', 'sso_enabled'])
            ->map(function (Application $app) {
                $app->setAttribute('provisionable', $this->client->isProvisionable($app));

                return $app;
            });

        return response()->json([
            'applications' => $applications,
            'abilities' => Application::ABILITIES,
        ]);
    }

    /**
     * Return the applications a given user has access to, with granular abilities.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $access = $user->applications()->get()->map(function ($app) {
            $perms = $this->decodeAppPermissions($app->pivot->app_permissions);

            return [
                'application_id' => $app->id,
                'abilities' => $this->decodeAbilities($app->pivot->abilities),
                'role' => $app->pivot->app_role,
                'permissions' => $perms['permissions'],
                'companyPermissions' => $perms['companyPermissions'],
            ];
        });

        return response()->json([
            'user_id' => $user->id,
            'application_ids' => $access->pluck('application_id'),
            'access' => $access->values(),
        ]);
    }

    /**
     * Return the role/module catalog exposed by an external app, so the UI can
     * render the per-app role selector and permission checkboxes.
     */
    public function catalog(Request $request, Application $application): JsonResponse
    {
        $this->authorizeAdmin($request);

        if (! $this->client->isProvisionable($application)) {
            return response()->json(['message' => 'La aplicación no admite aprovisionamiento'], Response::HTTP_BAD_REQUEST);
        }

        $catalog = $this->client->catalog($application);

        if ($catalog === null) {
            return response()->json(['message' => 'No se pudo obtener el catálogo de la aplicación'], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json($catalog);
    }

    /**
     * Importa hacia la suite los usuarios (rol + permisos) que ya existen en
     * las apps externas, para reflejarlos aquí y poder gestionarlos.
     */
    public function import(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $summary = $this->provisioner->importFromApps();

        AuditLogger::record(
            $request,
            'users.imported',
            'user',
            null,
            'Usuarios importados desde las apps externas',
            $summary
        );

        return response()->json(['summary' => $summary]);
    }

    /**
     * Refresca un usuario consultando las apps externas y reflejando su rol y
     * permisos actuales (pueden cambiar también desde las apps). Devuelve el
     * acceso ya actualizado.
     */
    public function refresh(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $this->provisioner->refreshUserFromApps($user);

        return $this->show($request, $user->fresh());
    }

    /**
     * Replace the set of applications (and per-app abilities) a user can access.
     * Accepts either `access` (granular) or `application_ids` (simple, defaults to view).
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'application_ids' => 'sometimes|array',
            'application_ids.*' => 'integer|exists:applications,id',
            'access' => 'sometimes|array',
            'access.*.application_id' => 'required|integer|exists:applications,id',
            'access.*.abilities' => 'nullable|array',
            'access.*.role' => 'nullable|string|max:190',
            'access.*.permissions' => 'nullable|array',
            'access.*.permissions.*' => 'string',
            'access.*.companyPermissions' => 'nullable|array',
        ]);

        $previousAppIds = $user->applications()->pluck('applications.id')->all();

        $sync = [];

        if (array_key_exists('access', $validated)) {
            foreach ($validated['access'] as $entry) {
                $abilities = array_values(array_intersect(
                    (array) ($entry['abilities'] ?? []),
                    Application::ABILITIES
                ));
                // Todo acceso implica al menos "view".
                if (!in_array('view', $abilities, true)) {
                    array_unshift($abilities, 'view');
                }
                $role = $entry['role'] ?? null;
                $sync[(int) $entry['application_id']] = [
                    'abilities' => json_encode($abilities),
                    'app_role' => $role !== null && $role !== '' ? (string) $role : null,
                    'app_permissions' => $this->encodeAppPermissions(
                        $entry['permissions'] ?? [],
                        $entry['companyPermissions'] ?? null
                    ),
                ];
            }
        } else {
            foreach ($validated['application_ids'] ?? [] as $appId) {
                $sync[(int) $appId] = ['abilities' => json_encode(['view'])];
            }
        }

        $user->applications()->sync($sync);

        AuditLogger::record(
            $request,
            'permissions.updated',
            'user',
            $user->id,
            "Permisos actualizados para {$user->name}",
            ['apps' => array_keys($sync)]
        );

        // Refleja rol/permisos/estado en las apps externas y bloquea las que se
        // le quitaron.
        $fresh = $user->fresh(['applications']);
        $this->provisioner->syncUser($fresh);
        $currentAppIds = $fresh->applications()->pluck('applications.id')->all();
        $this->provisioner->blockApplications($fresh, array_values(array_diff($previousAppIds, $currentAppIds)));

        return $this->show($request, $user->fresh());
    }

    private function decodeAbilities(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : ['view'];
    }

    private function decodePermissions(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values($raw);
        }
        if ($raw === null) {
            return [];
        }
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }

    /**
     * Interpreta app_permissions del pivote y separa lista plana (Sigcompro) y
     * módulos por compañía (Sigcom).
     *
     * @return array{permissions:array<int,string>, companyPermissions:array<string,array<int,string>>}
     */
    private function decodeAppPermissions(mixed $raw): array
    {
        $value = is_array($raw) ? $raw : json_decode((string) ($raw ?? ''), true);

        if (is_array($value) && array_key_exists('byCompany', $value)) {
            $byCompany = [];
            foreach ((array) $value['byCompany'] as $companyId => $perms) {
                $byCompany[(string) $companyId] = array_values((array) $perms);
            }

            return ['permissions' => [], 'companyPermissions' => $byCompany];
        }

        return [
            'permissions' => is_array($value) ? array_values($value) : [],
            'companyPermissions' => [],
        ];
    }

    /**
     * Construye el JSON de app_permissions: por compañía si se envía
     * companyPermissions, o lista plana en caso contrario.
     */
    private function encodeAppPermissions(mixed $permissions, mixed $companyPermissions): string
    {
        if (is_array($companyPermissions) && count($companyPermissions) > 0) {
            $byCompany = [];
            foreach ($companyPermissions as $companyId => $perms) {
                $byCompany[(string) $companyId] = array_values(array_unique(
                    array_map('strval', (array) $perms)
                ));
            }

            return json_encode(['byCompany' => $byCompany]);
        }

        return json_encode(array_values(array_unique(
            array_map('strval', (array) $permissions)
        )));
    }
}

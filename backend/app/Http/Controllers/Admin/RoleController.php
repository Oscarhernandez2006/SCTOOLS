<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Role;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class RoleController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()->is_admin, Response::HTTP_FORBIDDEN, 'No autorizado');
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $roles = Role::query()
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->present($role));

        return response()->json($roles);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $this->validateData($request);
        $data['slug'] = $this->uniqueSlug($data['name']);

        $role = Role::create($data);

        AuditLogger::record($request, 'role.created', 'role', $role->id, "Rol creado: {$role->name}");

        return response()->json($this->present($role->loadCount('users')), Response::HTTP_CREATED);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $this->validateData($request);
        $role->update($data);

        AuditLogger::record($request, 'role.updated', 'role', $role->id, "Rol actualizado: {$role->name}");

        return response()->json($this->present($role->loadCount('users')));
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->authorizeAdmin($request);

        $name = $role->name;
        $role->delete();

        AuditLogger::record($request, 'role.deleted', 'role', $role->id, "Rol eliminado: {$name}");

        return response()->json(['message' => 'Rol eliminado']);
    }

    private function validateData(Request $request): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:20',
            'is_admin' => 'boolean',
            'app_ids' => 'nullable|array',
            'app_ids.*' => 'integer|exists:applications,id',
            'abilities' => 'nullable|array',
        ]);

        // Sanea las habilidades: { "<appId>": ["view", ...] } contra la lista permitida.
        $abilities = [];
        foreach ((array) ($validated['abilities'] ?? []) as $appId => $list) {
            $clean = array_values(array_intersect((array) $list, Application::ABILITIES));
            if ($clean) {
                $abilities[(int) $appId] = $clean;
            }
        }

        return [
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? null,
            'is_admin' => $validated['is_admin'] ?? false,
            'app_ids' => array_values($validated['app_ids'] ?? []),
            'abilities' => $abilities ?: null,
        ];
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'rol';
        $slug = $base;
        $i = 2;
        while (Role::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function present(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'color' => $role->color,
            'is_admin' => (bool) $role->is_admin,
            'app_ids' => $role->app_ids ?? [],
            'abilities' => $role->abilities ?? (object) [],
            'users_count' => (int) ($role->users_count ?? 0),
        ];
    }
}

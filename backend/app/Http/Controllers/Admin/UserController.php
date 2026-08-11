<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiesaCredential;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    /**
     * Ensure the authenticated user is an administrator.
     */
    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()->is_admin, Response::HTTP_FORBIDDEN, 'No autorizado');
    }

    /**
     * List all users with their role, status, app access and Siesa state.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $siesaUserIds = SiesaCredential::query()->pluck('user_id')->all();

        $users = User::query()
            ->with(['applications:id'])
            ->orderBy('name')
            ->get(['id', 'name', 'cedula', 'email', 'is_active', 'is_admin'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'cedula' => $user->cedula,
                'email' => $user->email,
                'is_active' => (bool) $user->is_active,
                'is_admin' => (bool) $user->is_admin,
                'has_siesa' => in_array($user->id, $siesaUserIds, true),
                'application_ids' => $user->applications->pluck('id')->values(),
            ]);

        return response()->json($users);
    }

    /**
     * Create a user (with its Siesa credentials and optional app access).
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:190',
            'cedula' => 'required|string|max:50|unique:users,cedula',
            'email' => 'nullable|email|max:190|unique:users,email',
            'password' => 'required|string|min:6|max:190',
            'is_admin' => 'boolean',
            'is_active' => 'boolean',
            'application_ids' => 'nullable|array',
            'application_ids.*' => 'integer|exists:applications,id',
            'siesa_username' => 'nullable|string|max:190',
            'siesa_password' => 'nullable|string|max:190',
            'siesa_domain' => 'nullable|string|max:190',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'cedula' => $validated['cedula'],
            'email' => $validated['email'] ?? null,
            'password' => $validated['password'],
            'is_admin' => $validated['is_admin'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $user->applications()->sync($validated['application_ids'] ?? []);

        // El acceso es por cédula; las credenciales Siesa son opcionales.
        if (!empty($validated['siesa_username'])) {
            SiesaCredential::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'username' => $validated['siesa_username'],
                    'password' => $validated['siesa_password'] ?? '',
                    'domain' => $validated['siesa_domain'] ?? 'awssiesacloud',
                ]
            );
        }

        return response()->json($this->present($user), Response::HTTP_CREATED);
    }

    /**
     * Update a user. Password and Siesa credentials are optional on edit.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:190',
            'cedula' => ['required', 'string', 'max:50', Rule::unique('users', 'cedula')->ignore($user->id)],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:6|max:190',
            'is_admin' => 'boolean',
            'is_active' => 'boolean',
            'application_ids' => 'nullable|array',
            'application_ids.*' => 'integer|exists:applications,id',
            'siesa_username' => 'nullable|string|max:190',
            'siesa_password' => 'nullable|string|max:190',
            'siesa_domain' => 'nullable|string|max:190',
        ]);

        // Evita que un administrador se bloquee a sí mismo.
        if ($user->id === $request->user()->id) {
            if (array_key_exists('is_admin', $validated) && !$validated['is_admin']) {
                abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'No puedes quitarte a ti mismo el rol de administrador.');
            }
            if (array_key_exists('is_active', $validated) && !$validated['is_active']) {
                abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'No puedes desactivar tu propio usuario.');
            }
        }

        $user->name = $validated['name'];
        $user->cedula = $validated['cedula'];
        $user->email = $validated['email'] ?? null;
        if (!empty($validated['password'])) {
            $user->password = $validated['password'];
        }
        if (array_key_exists('is_admin', $validated)) {
            $user->is_admin = $validated['is_admin'];
        }
        if (array_key_exists('is_active', $validated)) {
            $user->is_active = $validated['is_active'];
        }
        $user->save();

        if (array_key_exists('application_ids', $validated)) {
            $user->applications()->sync($validated['application_ids'] ?? []);
        }

        // Solo se actualizan las credenciales de Siesa si vienen ambas.
        if (!empty($validated['siesa_username']) && !empty($validated['siesa_password'])) {
            SiesaCredential::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'username' => $validated['siesa_username'],
                    'password' => $validated['siesa_password'],
                    'domain' => $validated['siesa_domain'] ?? 'awssiesacloud',
                ]
            );
        }

        return response()->json($this->present($user->fresh()));
    }

    /**
     * Delete a user (its Siesa credential cascades).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($user->id === $request->user()->id) {
            abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'No puedes eliminar tu propio usuario.');
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado']);
    }

    /**
     * Shape a user for the API response.
     */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'cedula' => $user->cedula,
            'email' => $user->email,
            'is_active' => (bool) $user->is_active,
            'is_admin' => (bool) $user->is_admin,
            'has_siesa' => SiesaCredential::where('user_id', $user->id)->exists(),
            'application_ids' => $user->applications()->pluck('applications.id')->values(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UserAccessController extends Controller
{
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
            ->get(['id', 'slug', 'name', 'description', 'icon', 'category', 'color', 'type', 'is_active']);

        return response()->json($applications);
    }

    /**
     * Return the application ids a given user has access to.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'user_id' => $user->id,
            'application_ids' => $user->applications()->pluck('applications.id'),
        ]);
    }

    /**
     * Replace the set of applications a given user can access.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'application_ids' => 'present|array',
            'application_ids.*' => 'integer|exists:applications,id',
        ]);

        $user->applications()->sync($validated['application_ids']);

        return response()->json([
            'message' => 'Permisos actualizados',
            'user_id' => $user->id,
            'application_ids' => $user->applications()->pluck('applications.id'),
        ]);
    }
}

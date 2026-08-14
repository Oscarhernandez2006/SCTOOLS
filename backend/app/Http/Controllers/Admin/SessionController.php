<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class SessionController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()->is_admin, Response::HTTP_FORBIDDEN, 'No autorizado');
    }

    /**
     * Active sessions (personal access tokens) grouped across all users.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $tokens = PersonalAccessToken::query()
            ->with('tokenable:id,name,cedula')
            ->latest('last_used_at')
            ->latest('created_at')
            ->get()
            ->map(fn (PersonalAccessToken $token) => $this->present($token));

        return response()->json($tokens->values());
    }

    /**
     * Active sessions for a specific user.
     */
    public function forUser(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $tokens = $user->tokens()
            ->latest('last_used_at')
            ->get()
            ->map(fn (PersonalAccessToken $token) => $this->present($token));

        return response()->json($tokens->values());
    }

    /**
     * Revoke (delete) a specific session token.
     */
    public function revoke(Request $request, int $token): JsonResponse
    {
        $this->authorizeAdmin($request);

        $model = PersonalAccessToken::with('tokenable:id,name')->findOrFail($token);
        $ownerName = $model->tokenable->name ?? null;
        $model->delete();

        AuditLogger::record(
            $request,
            'session.revoked',
            'user',
            $model->tokenable_id,
            "Sesión revocada de {$ownerName}"
        );

        return response()->json(['message' => 'Sesión revocada']);
    }

    /**
     * The authenticated user's own active sessions.
     */
    public function mine(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()->id ?? null;

        $tokens = $request->user()->tokens()
            ->latest('last_used_at')
            ->get()
            ->map(fn (PersonalAccessToken $token) => array_merge(
                $this->present($token),
                ['current' => $token->id === $currentId]
            ));

        return response()->json($tokens->values());
    }

    private function present(PersonalAccessToken $token): array
    {
        return [
            'id' => $token->id,
            'user' => $token->tokenable->name ?? null,
            'user_id' => $token->tokenable_id,
            'name' => $token->name,
            'last_used_at' => $token->last_used_at?->toIso8601String(),
            'created_at' => $token->created_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\SsoTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class SsoController extends Controller
{
    /** Tiempo de vida del ticket en segundos. */
    private const TICKET_TTL = 120;

    /**
     * Genera un ticket SSO de un solo uso para que el usuario autenticado
     * abra una aplicación externa ya logueado.
     *
     * Requiere sesión (auth:sanctum).
     */
    public function ticket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => 'required|string',
        ]);

        $user = $request->user();

        $application = Application::query()
            ->where('slug', $data['slug'])
            ->where('is_active', true)
            ->first();

        if (! $application) {
            return response()->json(['message' => 'Aplicación no encontrada'], Response::HTTP_NOT_FOUND);
        }

        if (! $application->sso_enabled) {
            return response()->json(['message' => 'Esta aplicación no tiene SSO habilitado'], Response::HTTP_BAD_REQUEST);
        }

        // El usuario debe tener acceso concedido a la aplicación.
        $hasAccess = $user->applications()->where('applications.id', $application->id)->exists();
        if (! $hasAccess) {
            return response()->json(['message' => 'No tienes acceso a esta aplicación'], Response::HTTP_FORBIDDEN);
        }

        $token = Str::random(80);

        SsoTicket::create([
            'token' => $token,
            'user_id' => $user->id,
            'application_id' => $application->id,
            'email' => $user->email,
            'cedula' => $user->cedula,
            'name' => $user->name,
            'expires_at' => now()->addSeconds(self::TICKET_TTL),
        ]);

        $base = rtrim($application->url, '/');
        $redirectUrl = $base . '/sso/callback?ticket=' . $token;

        return response()->json([
            'redirect_url' => $redirectUrl,
            'expires_in' => self::TICKET_TTL,
        ]);
    }

    /**
     * Canjea un ticket SSO. Lo invoca el servidor de la aplicación receptora
     * (server-to-server), autenticado con el secreto compartido. Devuelve la
     * identidad del usuario y marca el ticket como usado.
     *
     * NO requiere sesión de usuario; se protege con el secreto compartido.
     */
    public function redeem(Request $request): JsonResponse
    {
        $secret = config('services.sso.shared_secret');
        $provided = (string) $request->header('X-SSO-Secret', '');

        if (empty($secret) || ! hash_equals((string) $secret, $provided)) {
            return response()->json(['message' => 'No autorizado'], Response::HTTP_UNAUTHORIZED);
        }

        $data = $request->validate([
            'ticket' => 'required|string',
        ]);

        $ticket = SsoTicket::query()->where('token', $data['ticket'])->first();

        if (! $ticket) {
            return response()->json(['message' => 'Ticket inválido'], Response::HTTP_NOT_FOUND);
        }

        if ($ticket->used_at !== null) {
            return response()->json(['message' => 'El ticket ya fue utilizado'], Response::HTTP_GONE);
        }

        if ($ticket->expires_at->isPast()) {
            return response()->json(['message' => 'El ticket ha expirado'], Response::HTTP_GONE);
        }

        // Consumir el ticket (un solo uso).
        $ticket->update([
            'used_at' => now(),
            'consumer_ip' => $request->ip(),
        ]);

        return response()->json([
            'email' => $ticket->email,
            'cedula' => $ticket->cedula,
            'name' => $ticket->name,
            'application' => $ticket->application?->slug,
        ]);
    }
}

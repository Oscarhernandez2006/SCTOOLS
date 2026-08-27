<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** Lista las últimas 40 notificaciones del usuario (propias + broadcast). */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $items = Notification::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->orderByDesc('created_at')
            ->limit(40)
            ->get()
            ->map(fn (Notification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'data' => $n->data,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
            ]);

        return response()->json($items);
    }

    /** Marca una notificación como leída (solo si le pertenece al usuario o es broadcast). */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $userId = $request->user()->id;
        abort_unless(
            $notification->user_id === $userId || $notification->user_id === null,
            403
        );

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['ok' => true]);
    }

    /** Marca todas las notificaciones visibles del usuario como leídas. */
    public function markAllRead(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        Notification::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}

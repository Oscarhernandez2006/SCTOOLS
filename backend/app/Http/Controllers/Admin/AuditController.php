<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()->is_admin, Response::HTTP_FORBIDDEN, 'No autorizado');
    }

    /**
     * Paginated audit log with optional filters (action, actor, date range, search).
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = AuditLog::query()->with('user:id,name')->latest();

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', (int) $userId);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('actor_name', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate((int) $request->query('per_page', 25));

        $logs->getCollection()->transform(fn (AuditLog $log) => [
            'id' => $log->id,
            'actor' => $log->user->name ?? $log->actor_name ?? 'Sistema',
            'action' => $log->action,
            'target_type' => $log->target_type,
            'target_id' => $log->target_id,
            'description' => $log->description,
            'meta' => $log->meta,
            'ip_address' => $log->ip_address,
            'at' => $log->created_at?->toIso8601String(),
        ]);

        return response()->json($logs);
    }

    /**
     * Distinct action names for the filter dropdown.
     */
    public function actions(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json(
            AuditLog::query()->distinct()->orderBy('action')->pluck('action')
        );
    }
}

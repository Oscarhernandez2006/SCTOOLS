<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    /**
     * Record an audit entry for an administrative action.
     */
    public static function record(
        Request $request,
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?string $description = null,
        array $meta = []
    ): void {
        $actor = $request->user();

        AuditLog::create([
            'user_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'description' => $description,
            'meta' => $meta ?: null,
            'ip_address' => $request->ip(),
        ]);
    }
}

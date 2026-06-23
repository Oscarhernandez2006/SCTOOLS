<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'token',
    'user_id',
    'application_id',
    'email',
    'cedula',
    'name',
    'expires_at',
    'used_at',
    'consumer_ip',
])]
class SsoTicket extends Model
{
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** El ticket sigue siendo válido si no se ha usado y no ha expirado. */
    public function isRedeemable(): bool
    {
        return $this->used_at === null && $this->expires_at->isFuture();
    }
}

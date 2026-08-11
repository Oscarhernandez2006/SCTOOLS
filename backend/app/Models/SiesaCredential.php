<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiesaCredential extends Model
{
    protected $fillable = [
        'user_id',
        'domain',
        'username',
        'password',
    ];

    /**
     * Las credenciales se cifran en reposo con la APP_KEY (AES-256).
     */
    protected function casts(): array
    {
        return [
            'username' => 'encrypted',
            'password' => 'encrypted',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'color', 'is_admin', 'app_ids', 'abilities'];

    protected function casts(): array
    {
        return [
            'is_admin' => 'boolean',
            'app_ids' => 'array',
            'abilities' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}

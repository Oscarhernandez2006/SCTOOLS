<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable([
    'slug',
    'name',
    'description',
    'icon',
    'url',
    'category',
    'color',
    'logo',
    'keywords',
    'type',
    'sso_enabled',
    'is_active',
    'sort_order',
])]
class Application extends Model
{
    protected function casts(): array
    {
        return [
            'sso_enabled' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}

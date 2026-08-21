<?php

use App\Models\Application;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Deja solo 2 roles de suite: Administrador (acceso total) y Normal (solo
     * ver, sin administrar). Idempotente.
     */
    public function up(): void
    {
        $appIds = Application::query()->pluck('id')->all();

        Role::updateOrCreate(
            ['slug' => 'administrador'],
            [
                'name' => 'Administrador',
                'description' => 'Acceso total: puede ver y modificar todo.',
                'color' => '#57AD31',
                'is_admin' => true,
                'app_ids' => $appIds,
                'abilities' => null,
            ]
        );

        Role::updateOrCreate(
            ['slug' => 'normal'],
            [
                'name' => 'Normal',
                'description' => 'Solo puede ver; no administra ni edita.',
                'color' => '#4A7FB5',
                'is_admin' => false,
                'app_ids' => $appIds,
                'abilities' => null,
            ]
        );
    }

    public function down(): void
    {
        Role::whereIn('slug', ['administrador', 'normal'])->delete();
    }
};

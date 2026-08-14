<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Roles/grupos con presets de acceso y permisos.
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('color', 20)->nullable();
            $table->boolean('is_admin')->default(false);
            // Preset de acceso: ids de aplicaciones que otorga el rol.
            $table->json('app_ids')->nullable();
            // Preset de habilidades por aplicación: { "<appId>": ["view","edit"] }.
            $table->json('abilities')->nullable();
            $table->timestamps();
        });

        // Rol asignado al usuario (opcional; el acceso individual sigue mandando).
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('is_admin')
                ->constrained('roles')->nullOnDelete();
        });

        // Permisos granulares por usuario y aplicación.
        Schema::table('application_user', function (Blueprint $table) {
            $table->json('abilities')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('application_user', function (Blueprint $table) {
            $table->dropColumn('abilities');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('roles');
    }
};

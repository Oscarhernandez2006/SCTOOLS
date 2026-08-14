<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rollup diario de presencia por usuario (solo conteo de segundos; nunca imagen/video).
        Schema::create('presence_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('present_seconds')->default(0);
            $table->unsignedInteger('absent_seconds')->default(0);
            $table->unsignedInteger('samples')->default(0);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
            $table->index('date');
        });

        // Consentimiento explícito para el monitoreo de presencia por cámara.
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('presence_consent_at')->nullable()->after('role_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('presence_consent_at');
        });

        Schema::dropIfExists('presence_days');
    }
};

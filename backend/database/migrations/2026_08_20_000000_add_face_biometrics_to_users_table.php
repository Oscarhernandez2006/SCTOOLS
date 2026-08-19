<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Segundo factor biométrico (reconocimiento facial).
     *
     * Se guarda ÚNICAMENTE el descriptor matemático (vector de 128 números)
     * calculado en el navegador con face-api.js; nunca la fotografía. El
     * servidor compara descriptores por distancia euclidiana en el login.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Lista JSON de descriptores (1..N muestras de 128 floats cada una).
            $table->longText('face_descriptor')->nullable()->after('is_admin');
            $table->timestamp('face_enrolled_at')->nullable()->after('face_descriptor');
            // Permiso temporal para omitir el factor facial (otorgado por un admin).
            $table->timestamp('face_bypass_until')->nullable()->after('face_enrolled_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['face_descriptor', 'face_enrolled_at', 'face_bypass_until']);
        });
    }
};

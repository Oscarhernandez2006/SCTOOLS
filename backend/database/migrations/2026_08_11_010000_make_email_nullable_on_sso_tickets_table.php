<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Los usuarios pueden no tener email (el login es por cédula), así que el
     * ticket SSO tampoco debe exigirlo.
     */
    public function up(): void
    {
        Schema::table('sso_tickets', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sso_tickets', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }
};

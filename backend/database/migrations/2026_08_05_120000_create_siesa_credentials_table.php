<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('siesa_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('domain')->default('awssiesacloud');
            // Almacenados cifrados a nivel de aplicación (cast 'encrypted', AES-256 con APP_KEY).
            $table->text('username');
            $table->text('password');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('siesa_credentials');
    }
};

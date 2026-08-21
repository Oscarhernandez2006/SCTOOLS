<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-app role and module permissions granted to a user, used to provision
     * the user into external apps (SIGCOM, SIGCOMPRO) with the same identity.
     */
    public function up(): void
    {
        Schema::table('application_user', function (Blueprint $table) {
            $table->string('app_role')->nullable()->after('abilities');
            $table->json('app_permissions')->nullable()->after('app_role');
        });
    }

    public function down(): void
    {
        Schema::table('application_user', function (Blueprint $table) {
            $table->dropColumn(['app_role', 'app_permissions']);
        });
    }
};

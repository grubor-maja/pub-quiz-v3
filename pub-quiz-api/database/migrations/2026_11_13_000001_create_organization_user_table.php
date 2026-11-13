<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who administers which organization. A row here lets a user edit that
     * organization and manage its quizzes, nothing more: site-wide rights
     * still come only from users.is_admin.
     */
    public function up(): void
    {
        Schema::create('organization_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'organization_id']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_user');
    }
};

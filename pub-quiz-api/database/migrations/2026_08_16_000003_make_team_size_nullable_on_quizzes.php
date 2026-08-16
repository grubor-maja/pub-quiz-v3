<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Team size is often only half-stated ("min 2 igraca") or not stated at
        // all. Defaulting the other half to 1-6 published a number the organizer
        // never gave, so both sides are now nullable and "unknown" is rendered
        // as such instead of being invented.
        Schema::table('quizzes', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_team_members')->nullable()->default(null)->change();
            $table->unsignedTinyInteger('max_team_members')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_team_members')->default(1)->nullable(false)->change();
            $table->unsignedTinyInteger('max_team_members')->default(6)->nullable(false)->change();
        });
    }
};

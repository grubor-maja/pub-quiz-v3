<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Per-organization fallbacks used by the extraction pipeline when the
            // Instagram caption does not state these explicitly.
            $table->string('default_location')->nullable()->after('description');
            $table->string('default_address')->nullable()->after('default_location');
            $table->time('default_quiz_time')->nullable()->after('default_address');
            $table->unsignedInteger('default_entry_fee')->nullable()->after('default_quiz_time');
            $table->string('default_contact_phone')->nullable()->after('default_entry_fee');
            $table->unsignedTinyInteger('default_min_team_members')->nullable()->after('default_contact_phone');
            $table->unsignedTinyInteger('default_max_team_members')->nullable()->after('default_min_team_members');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'default_location',
                'default_address',
                'default_quiz_time',
                'default_entry_fee',
                'default_contact_phone',
                'default_min_team_members',
                'default_max_team_members',
            ]);
        });
    }
};

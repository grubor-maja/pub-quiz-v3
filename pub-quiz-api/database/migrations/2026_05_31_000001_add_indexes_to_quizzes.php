<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->index(['status', 'quiz_date'], 'quizzes_status_date_idx');
            $table->index('organization_id', 'quizzes_org_idx');
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropIndex('quizzes_status_date_idx');
            $table->dropIndex('quizzes_org_idx');
        });
    }
};

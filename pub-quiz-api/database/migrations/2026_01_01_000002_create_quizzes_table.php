<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quizzes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->date('quiz_date')->nullable();
            $table->time('quiz_time')->nullable();
            $table->string('location')->nullable();
            $table->string('address')->nullable();
            $table->unsignedInteger('entry_fee')->nullable();
            $table->unsignedTinyInteger('min_team_members')->default(1);
            $table->unsignedTinyInteger('max_team_members')->default(6);
            $table->string('contact_phone')->nullable();
            $table->string('cover_image_url')->nullable();
            $table->string('instagram_post_url')->nullable();
            $table->enum('status', ['published', 'draft', 'completed', 'cancelled'])->default('draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quizzes');
    }
};

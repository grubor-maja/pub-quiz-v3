<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('quiz_id');
            $table->foreign('quiz_id')->references('id')->on('quizzes')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'quiz_id']);
            $table->index('quiz_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};

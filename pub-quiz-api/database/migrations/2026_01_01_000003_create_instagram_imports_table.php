<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instagram_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('instagram_post_id')->unique();
            $table->text('instagram_post_url')->nullable();
            $table->string('short_code')->nullable();
            $table->text('caption')->nullable();
            $table->text('image_url')->nullable();
            $table->string('owner_username')->nullable();
            $table->string('location_name')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->json('raw_data')->nullable();
            $table->json('extracted_data')->nullable();
            $table->enum('status', ['pending', 'processed', 'skipped', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->foreignUuid('quiz_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instagram_imports');
    }
};

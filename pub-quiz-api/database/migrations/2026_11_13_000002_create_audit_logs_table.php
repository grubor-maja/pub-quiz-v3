<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A record of every change made through the admin panels. Rows are never
     * updated or deleted by the application.
     *
     * The user's name and the subject's label are copied in rather than only
     * referenced, so an entry still reads correctly after the user, quiz or
     * organization it mentions is gone. That is the case the log exists for.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('action', 64);
            $table->string('subject_type', 32)->nullable();
            $table->string('subject_id', 64)->nullable();
            $table->string('subject_label')->nullable();
            // No foreign key: the entry must outlive the organization.
            $table->uuid('organization_id')->nullable();
            $table->json('changes')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at');
            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

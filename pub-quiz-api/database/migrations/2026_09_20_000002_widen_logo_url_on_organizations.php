<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Instagram's signed CDN URLs run well past 500 characters. We now copy
        // the image onto our own storage and keep a short path, but an external
        // URL pasted by hand should fail validation rather than throw a 500 out
        // of the database.
        Schema::table('organizations', function (Blueprint $table) {
            $table->text('logo_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('logo_url')->nullable()->change();
        });
    }
};

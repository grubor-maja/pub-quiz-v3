<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Same order the admin form offers them, so existing organizations get distinct colors. */
    private const COLORS = ['zlatna', 'roze', 'crvena', 'lime', 'tirkiz', 'koral', 'ljubicasta', 'led'];

    private const KNOWN = [
        'pabkviz8x8' => ['dragon_color' => 'tirkiz', 'dragon_prop' => 'lopta', 'dragon_shirt' => 'plava'],
        'pabkviz_obratipaznju' => ['dragon_color' => 'koral', 'dragon_prop' => 'sijalica', 'dragon_shirt' => 'bela'],
        'pab_kviz_inkvizitor' => ['dragon_color' => 'ljubicasta', 'dragon_prop' => 'lupa', 'dragon_shirt' => 'crna'],
        'pabkviz.rs' => ['dragon_color' => 'led', 'dragon_prop' => 'ljutko', 'dragon_shirt' => 'crna'],
    ];

    public function up(): void
    {
        // Every organization has a mascot: the site's dragon in its own color,
        // holding one prop, wearing a shirt with the organization's logo. The
        // logo comes from logo_url, so only these three choices are stored.
        // Names rather than hex codes, so the palette can change in the
        // frontend without touching the data.
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('dragon_color', 16)->default('lime')->after('logo_url');
            $table->string('dragon_prop', 16)->default('knjiga')->after('dragon_color');
            $table->string('dragon_shirt', 16)->default('teget')->after('dragon_prop');
        });

        $orgs = DB::table('organizations')->orderBy('created_at')->get(['id', 'instagram_handle']);
        foreach ($orgs as $i => $org) {
            // The dragons agreed in the redesign, matched on the Instagram
            // handle because slugs differ between local and production.
            $dragon = self::KNOWN[strtolower((string) $org->instagram_handle)]
                ?? ['dragon_color' => self::COLORS[$i % count(self::COLORS)]];

            DB::table('organizations')->where('id', $org->id)->update($dragon);
        }
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['dragon_color', 'dragon_prop', 'dragon_shirt']);
        });
    }
};

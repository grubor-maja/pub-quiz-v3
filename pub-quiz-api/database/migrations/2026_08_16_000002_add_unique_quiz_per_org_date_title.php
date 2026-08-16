<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX = 'quizzes_org_date_title_unique';

    public function up(): void
    {
        $this->collapseExistingDuplicates();

        Schema::table('quizzes', function (Blueprint $table) {
            // Second layer of duplicate defence. The sync job already uses
            // firstOrCreate on the same triple; this guarantees it at the DB level.
            // Rows with a NULL quiz_date are exempt (MySQL treats NULLs as distinct).
            $table->unique(['organization_id', 'quiz_date', 'title'], self::INDEX);
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropUnique(self::INDEX);
        });
    }

    /**
     * Merge pre-existing duplicates so the unique index can be created.
     * Keeps the oldest row of each group and re-points favorites / imports to it.
     */
    private function collapseExistingDuplicates(): void
    {
        $groups = DB::table('quizzes')
            ->select('organization_id', 'quiz_date', 'title', DB::raw('COUNT(*) as total'))
            ->whereNotNull('quiz_date')
            ->groupBy('organization_id', 'quiz_date', 'title')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $group) {
            $ids = DB::table('quizzes')
                ->where('organization_id', $group->organization_id)
                ->where('quiz_date', $group->quiz_date)
                ->where('title', $group->title)
                ->orderBy('created_at')
                ->orderBy('id')
                ->pluck('id')
                ->all();

            $keeper = array_shift($ids);
            if ($keeper === null || $ids === []) {
                continue;
            }

            // favorites has a unique(user_id, quiz_id): drop rows that would collide,
            // then re-point the remainder at the keeper. The ids are read into PHP
            // first because MySQL cannot subquery the table it is deleting from.
            $alreadyFavorited = DB::table('favorites')->where('quiz_id', $keeper)->pluck('user_id')->all();

            if ($alreadyFavorited !== []) {
                DB::table('favorites')
                    ->whereIn('quiz_id', $ids)
                    ->whereIn('user_id', $alreadyFavorited)
                    ->delete();
            }

            DB::table('favorites')->whereIn('quiz_id', $ids)->update(['quiz_id' => $keeper]);
            DB::table('instagram_imports')->whereIn('quiz_id', $ids)->update(['quiz_id' => $keeper]);
            DB::table('quizzes')->whereIn('id', $ids)->delete();

            Log::info('Collapsed duplicate quizzes', [
                'kept' => $keeper,
                'removed' => count($ids),
                'title' => $group->title,
                'quiz_date' => $group->quiz_date,
            ]);
        }
    }
};

<?php

namespace App\Console\Commands;

use App\Models\Quiz;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes upcoming quizzes that are still only a line in a monthly schedule -
 * no cover image means the organizer has not given that evening its own post yet.
 *
 * Past quizzes are left alone so the archive keeps its history, and any quiz
 * someone has favorited is kept too rather than vanishing from their profile.
 */
class PruneUnannouncedQuizzes extends Command
{
    protected $signature = 'quizzes:prune-unannounced
                            {--org= : Limit to one organization slug}
                            {--dry : List what would be removed without deleting}';

    protected $description = 'Delete upcoming quizzes that have no artwork of their own yet';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $orgSlug = $this->option('org');

        $favorited = DB::table('favorites')->distinct()->pluck('quiz_id')->all();

        $quizzes = Quiz::whereNull('cover_image_url')
            ->whereDate('quiz_date', '>=', now()->toDateString())
            ->whereNotIn('id', $favorited)
            ->with('organization:id,name,slug')
            ->when($orgSlug, fn ($q) => $q->whereHas('organization', fn ($o) => $o->where('slug', $orgSlug)))
            ->orderBy('quiz_date')
            ->get();

        if ($quizzes->isEmpty()) {
            $this->info('Nothing to prune.');

            return 0;
        }

        foreach ($quizzes as $quiz) {
            $this->line("  {$quiz->quiz_date->format('d.m.Y')}  {$quiz->organization?->name}  {$quiz->title}");
        }

        if ($dry) {
            $this->info("Would delete {$quizzes->count()} quiz(es).");

            return 0;
        }

        $count = $quizzes->count();
        Quiz::whereIn('id', $quizzes->pluck('id'))->delete();
        $this->info("Deleted {$count} quiz(es) with no artwork of their own.");

        return 0;
    }
}

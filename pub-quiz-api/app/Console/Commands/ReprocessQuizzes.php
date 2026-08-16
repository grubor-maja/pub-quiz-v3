<?php

namespace App\Console\Commands;

use App\Models\InstagramImport;
use App\Models\Quiz;
use App\Services\QuizExtractionService;
use Illuminate\Console\Command;

class ReprocessQuizzes extends Command
{
    protected $signature = 'quizzes:reprocess
                            {--dry : Show changes without saving}
                            {--org= : Limit to one organization slug}';

    protected $description = 'Re-run extraction on stored instagram_imports and update linked quizzes';

    public function handle(QuizExtractionService $extractor): int
    {
        $dry = (bool) $this->option('dry');
        $orgSlug = $this->option('org');

        $imports = InstagramImport::whereNotNull('quiz_id')
            ->with(['quiz', 'organization'])
            ->when($orgSlug, fn ($q) => $q->whereHas('organization', fn ($o) => $o->where('slug', $orgSlug)))
            ->get();

        $this->info("Reprocessing {$imports->count()} imports" . ($dry ? ' (DRY RUN)' : ''));
        $updated = 0;

        foreach ($imports as $import) {
            $quiz = $import->quiz;
            $org = $import->organization;
            if (!$quiz || !$org) {
                continue;
            }

            $caption = $import->caption ?? '';
            $postDate = $import->posted_at?->format('Y-m-d') ?? now()->format('Y-m-d');
            $candidates = $extractor->extract($org, $caption, $postDate, $import->image_url);

            $candidate = $this->matchCandidate($candidates, $quiz);
            if ($candidate === null) {
                continue;
            }

            $changes = [];
            foreach (['title', 'min_team_members', 'max_team_members'] as $field) {
                $new = $candidate[$field] ?? null;
                if ($new !== null && $new !== $quiz->{$field}) {
                    $changes[$field] = ['old' => $quiz->{$field}, 'new' => $new];
                }
            }

            if ($changes === []) {
                continue;
            }

            $this->line("Quiz {$quiz->id} ({$quiz->quiz_date}):");
            foreach ($changes as $field => $vals) {
                $this->line("  {$field}: '{$vals['old']}' -> '{$vals['new']}'");
            }

            if (!$dry) {
                $quiz->update(array_map(fn ($v) => $v['new'], $changes));
                $import->extracted_data = $candidates;
                $import->save();
            }
            $updated++;
        }

        $this->info(($dry ? 'Would update' : 'Updated') . " {$updated} quizzes");

        return 0;
    }

    /**
     * A post can now yield several quizzes, so pick the one matching this quiz's
     * date. Falls back to the sole candidate when a post produced exactly one.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     */
    private function matchCandidate(array $candidates, Quiz $quiz): ?array
    {
        if ($candidates === []) {
            return null;
        }

        $date = $quiz->quiz_date?->format('Y-m-d');
        foreach ($candidates as $candidate) {
            if (($candidate['quiz_date'] ?? null) === $date) {
                return $candidate;
            }
        }

        return count($candidates) === 1 ? $candidates[0] : null;
    }
}

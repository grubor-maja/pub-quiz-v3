<?php

namespace App\Console\Commands;

use App\Models\InstagramImport;
use App\Services\QuizExtractionService;
use Illuminate\Console\Command;

class ReprocessQuizzes extends Command
{
    protected $signature = 'quizzes:reprocess {--dry : Show changes without saving}';
    protected $description = 'Re-run extraction on stored instagram_imports and update linked quizzes';

    public function handle(QuizExtractionService $extractor): int
    {
        $dry = (bool) $this->option('dry');
        $imports = InstagramImport::whereNotNull('quiz_id')->with('quiz')->get();

        $this->info("Reprocessing {$imports->count()} imports" . ($dry ? ' (DRY RUN)' : ''));
        $updated = 0;

        foreach ($imports as $import) {
            $quiz = $import->quiz;
            if (!$quiz) continue;

            $caption = $import->caption ?? '';
            $postDate = $import->posted_at?->format('Y-m-d') ?? now()->format('Y-m-d');
            $extracted = $extractor->extract($caption, $postDate, $import->image_url);

            $changes = [];
            $newTitle = $extracted['title'] ?? null;
            if ($newTitle && $newTitle !== $quiz->title) {
                $changes['title'] = ['old' => $quiz->title, 'new' => $newTitle];
            }
            if (isset($extracted['min_team_members']) && $extracted['min_team_members'] !== $quiz->min_team_members) {
                $changes['min_team_members'] = ['old' => $quiz->min_team_members, 'new' => $extracted['min_team_members']];
            }
            if (isset($extracted['max_team_members']) && $extracted['max_team_members'] !== $quiz->max_team_members) {
                $changes['max_team_members'] = ['old' => $quiz->max_team_members, 'new' => $extracted['max_team_members']];
            }

            if (empty($changes)) continue;

            $this->line("Quiz {$quiz->id} ({$quiz->quiz_date}):");
            foreach ($changes as $field => $vals) {
                $this->line("  {$field}: '{$vals['old']}' -> '{$vals['new']}'");
            }

            if (!$dry) {
                $updates = [];
                foreach ($changes as $field => $vals) {
                    $updates[$field] = $vals['new'];
                }
                $quiz->update($updates);
                $import->extracted_data = $extracted;
                $import->save();
            }
            $updated++;
        }

        $this->info(($dry ? 'Would update' : 'Updated') . " {$updated} quizzes");
        return 0;
    }
}

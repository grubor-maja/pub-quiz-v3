<?php

namespace App\Console\Commands;

use App\Jobs\SyncInstagramPosts;
use App\Models\InstagramImport;
use App\Services\QuizExtractionService;
use Illuminate\Console\Command;

/**
 * Re-runs extraction over already-scraped Instagram posts. Useful after tuning a
 * prompt or adding an organization extractor: posts that were wrongly skipped can
 * be re-evaluated without paying for another Apify scrape.
 */
class ReprocessImports extends Command
{
    protected $signature = 'instagram:reprocess-imports
                            {--org= : Limit to one organization slug}
                            {--status=skipped : Which imports to re-evaluate (skipped, failed, pending)}';

    protected $description = 'Re-run quiz extraction on stored Instagram imports (no Apify call)';

    public function handle(QuizExtractionService $extractor): int
    {
        $status = $this->option('status');
        $orgSlug = $this->option('org');

        $imports = InstagramImport::where('status', $status)
            ->whereNotNull('organization_id')
            ->with('organization')
            ->when($orgSlug, fn ($q) => $q->whereHas('organization', fn ($o) => $o->where('slug', $orgSlug)))
            ->get();

        if ($imports->isEmpty()) {
            $this->info("No imports with status '{$status}'" . ($orgSlug ? " for {$orgSlug}" : '') . '.');

            return 0;
        }

        $this->info("Re-evaluating {$imports->count()} '{$status}' imports...");

        $job = new SyncInstagramPosts();
        $recovered = 0;
        $deferred = 0;

        foreach ($imports as $import) {
            $job->processImport($import, $import->organization, $extractor);

            if ($import->status === 'processed') {
                $count = is_array($import->extracted_data) ? count($import->extracted_data) : 0;
                $this->line("  recovered {$count} quiz(es) from {$import->instagram_post_id}");
                $recovered++;
            } elseif ($import->status === 'pending') {
                $this->warn("  extraction unavailable for {$import->instagram_post_id} - still pending");
                $deferred++;
            }
        }

        // Cancellations deferred for want of a quiz to cancel can succeed now
        // that the rest of the batch has been imported.
        if ($deferred > 0) {
            $this->info("Second pass over {$deferred} deferred import(s)...");
            foreach ($imports as $import) {
                if ($import->status !== 'pending') {
                    continue;
                }
                $job->processImport($import, $import->organization, $extractor);
                if ($import->status === 'processed') {
                    $deferred--;
                }
            }
        }

        $this->info("Done. {$recovered} of {$imports->count()} imports now yield quizzes.");

        if ($deferred > 0) {
            $this->warn("{$deferred} import(s) still deferred (rate limit, or a cancellation whose quiz was never announced).");
        }

        return 0;
    }
}

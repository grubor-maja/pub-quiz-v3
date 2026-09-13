<?php

namespace App\Console\Commands;

use App\Jobs\SyncInstagramPosts;
use App\Models\InstagramImport;
use App\Models\Organization;
use App\Services\QuizExtractionService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Creates quizzes from a caption pasted by hand, without calling Apify.
 *
 * Apify only ever fetches the text; everything that turns text into quizzes is
 * ours and costs nothing extra. So when the scraping quota is spent - or an
 * organization announces something Apify missed - a caption copied from the
 * browser is enough to keep the site current.
 *
 * It builds the same InstagramImport record the sync would have created and
 * hands it to the same processor, so deduplication, enrichment, cancellation
 * handling and the artwork rules all behave identically.
 *
 * Usage:
 *   php artisan quizzes:add-from-caption --org=i-hate-quiz --image=https://... < caption.txt
 *   cat caption.txt | php artisan quizzes:add-from-caption --org=i-hate-quiz
 */
class AddQuizFromCaption extends Command
{
    protected $signature = 'quizzes:add-from-caption
                            {--org= : Organization slug the post belongs to}
                            {--image= : URL of the post image, so the quiz has artwork}
                            {--date= : Post date (Y-m-d), defaults to today}
                            {--dry : Show what would be extracted without saving}';

    protected $description = 'Create quizzes from a caption pasted by hand (no Apify call)';

    public function handle(QuizExtractionService $extractor): int
    {
        $org = Organization::where('slug', $this->option('org'))->first();
        if (!$org) {
            $this->error('Organization not found. Available: '
                . Organization::pluck('slug')->implode(', '));

            return 1;
        }

        $caption = trim((string) file_get_contents('php://stdin'));
        if ($caption === '') {
            $this->error('No caption on stdin. Pipe one in: ... < caption.txt');

            return 1;
        }

        $postDate = $this->option('date') ?: now()->format('Y-m-d');
        $imageUrl = $this->option('image') ?: null;

        $this->info("Organization: {$org->name}");
        $this->info('Post date:    ' . $postDate);
        $this->info('Caption:      ' . mb_strlen($caption) . ' characters');
        $this->info('Image:        ' . ($imageUrl ? 'yes' : 'none - the quiz will be pruned unless one is given'));
        $this->newLine();

        $candidates = $extractor->extract($org, $caption, $postDate, $imageUrl);

        if ($candidates === []) {
            $this->warn('No quiz found in this caption.');

            return 1;
        }

        $this->info('Found ' . count($candidates) . ' quiz(es):');
        foreach ($candidates as $c) {
            $this->line(sprintf(
                '  %s  %-6s %s',
                $c['quiz_date'] ?? '?',
                substr((string) ($c['quiz_time'] ?? '-'), 0, 5),
                $c['title'] ?? '(no title)'
            ));
        }
        $this->newLine();

        if ($this->option('dry')) {
            $this->comment('Dry run - nothing saved.');

            return 0;
        }

        // A synthetic import, so the normal processor handles it. The id is
        // derived from the caption so pasting the same text twice is a no-op
        // rather than a duplicate.
        $import = InstagramImport::firstOrCreate(
            ['instagram_post_id' => 'manual-' . substr(sha1($org->id . $caption), 0, 24)],
            [
                'caption' => $caption,
                'image_url' => $imageUrl,
                'owner_username' => $org->instagram_handle,
                'posted_at' => $postDate . ' 12:00:00',
                'organization_id' => $org->id,
                'status' => 'pending',
                'raw_data' => ['source' => 'manual', 'added_at' => now()->toIso8601String()],
            ]
        );

        if (!$import->wasRecentlyCreated && $import->status !== 'pending') {
            $this->warn('This caption was already added (status: ' . $import->status . ').');

            return 0;
        }

        (new SyncInstagramPosts())->processImport($import, $org, $extractor);

        $this->newLine();
        $this->info('Import status: ' . $import->fresh()->status);
        $this->info('Run "php artisan geocode:quizzes" next so it appears on the map.');

        return 0;
    }
}

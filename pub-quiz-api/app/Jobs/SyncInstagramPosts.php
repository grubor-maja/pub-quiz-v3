<?php

namespace App\Jobs;

use App\Models\InstagramImport;
use App\Models\Organization;
use App\Models\Quiz;
use App\Services\ApifyService;
use App\Services\Extraction\ExtractionUnavailableException;
use App\Services\QuizExtractionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SyncInstagramPosts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private ?string $orgSlug = null)
    {
    }

    public function handle(ApifyService $apify, QuizExtractionService $extractor): void
    {
        $organizations = Organization::whereNotNull('instagram_handle')
            ->when($this->orgSlug, fn ($q) => $q->where('slug', $this->orgSlug))
            ->get();

        if ($organizations->isEmpty()) {
            Log::info('Instagram sync: no organizations with instagram_handle', ['org' => $this->orgSlug]);
            return;
        }

        foreach ($organizations as $org) {
            $this->syncOrganization($org, $apify, $extractor);
        }
    }

    private function syncOrganization(
        Organization $org,
        ApifyService $apify,
        QuizExtractionService $extractor
    ): void {
        Log::info("Instagram sync: fetching posts for @{$org->instagram_handle}");

        $posts = $apify->fetchPostsForHandle($org->instagram_handle);

        if (empty($posts)) {
            Log::warning("Instagram sync: no posts for @{$org->instagram_handle}");
            return;
        }

        foreach ($posts as $post) {
            $postId = $post['id'] ?? $post['shortCode'] ?? null;
            if (!$postId) continue;

            $import = InstagramImport::firstOrCreate(
                ['instagram_post_id' => $postId],
                [
                    'instagram_post_url' => $post['url'] ?? null,
                    'short_code' => $post['shortCode'] ?? null,
                    'caption' => $post['caption'] ?? null,
                    'image_url' => $post['displayUrl'] ?? null,
                    'owner_username' => $post['ownerUsername'] ?? null,
                    'location_name' => $post['locationName'] ?? null,
                    'posted_at' => isset($post['timestamp']) ? date('Y-m-d H:i:s', strtotime((string) $post['timestamp'])) : null,
                    'raw_data' => $post,
                    'organization_id' => $org->id,
                    'status' => 'pending',
                ]
            );

            // Anything already processed, skipped or failed is left alone; a
            // still-pending import is retried so an interrupted run heals itself.
            if ($import->status !== 'pending') {
                continue;
            }

            $this->processImport($import, $org, $extractor);
        }
    }

    /**
     * Public so imports can be re-evaluated after an extraction change without
     * paying for another Apify scrape (see the instagram:reprocess-imports command).
     */
    public function processImport(
        InstagramImport $import,
        Organization $org,
        QuizExtractionService $extractor
    ): void {
        try {
            $caption = $import->caption ?? '';
            $postDate = $import->posted_at?->format('Y-m-d') ?? now()->format('Y-m-d');

            // A post yields zero (not a quiz announcement), one, or - for schedule
            // posts listing many dates at once - several quizzes.
            $candidates = $extractor->extract($org, $caption, $postDate, $import->image_url);
            $import->extracted_data = $candidates;

            if ($candidates === []) {
                $import->status = 'skipped';
                $import->save();
                Log::info("Instagram sync: no quiz found in post {$import->instagram_post_id}");
                return;
            }

            // Downloaded once and shared by every quiz extracted from this post.
            $localImageUrl = $import->image_url
                ? $this->downloadAndStoreImage($import->image_url, $import->instagram_post_id)
                : null;

            $created = 0;
            $firstQuizId = null;

            foreach ($candidates as $candidate) {
                $quiz = $this->createQuiz($candidate, $org, $import, $localImageUrl);
                $firstQuizId ??= $quiz->id;

                if ($quiz->wasRecentlyCreated) {
                    $created++;
                    Log::info("Instagram sync: created quiz '{$quiz->title}' ({$quiz->quiz_date})");
                } else {
                    Log::info("Instagram sync: duplicate skipped '{$quiz->title}' ({$quiz->quiz_date})");
                }
            }

            $import->quiz_id = $firstQuizId;
            $import->status = 'processed';
            $import->save();

            Log::info("Instagram sync: post {$import->instagram_post_id} produced {$created} new quiz(es)");
        } catch (ExtractionUnavailableException $e) {
            // Transient (rate limit / outage). Leave the import pending so the next
            // run retries it - marking it skipped would lose the post for good.
            $import->status = 'pending';
            $import->error_message = $e->getMessage();
            $import->save();
            Log::warning("Instagram sync: extraction unavailable for {$import->instagram_post_id}, left pending");
        } catch (\Throwable $e) {
            $import->status = 'failed';
            $import->error_message = $e->getMessage();
            $import->save();
            Log::error("Instagram sync: failed to process import {$import->id}", ['error' => $e->getMessage()]);
        }
    }

    /**
     * Idempotent on (organization_id, quiz_date, title) so re-announcements of
     * the same quiz - or a schedule repeated across posts - never duplicate.
     */
    private function createQuiz(
        array $candidate,
        Organization $org,
        InstagramImport $import,
        ?string $localImageUrl
    ): Quiz {
        $date = $candidate['quiz_date'];
        $title = $candidate['title'] ?: "Kviz {$org->name} {$date}";

        // The same evening is often announced twice - once in a monthly schedule
        // and once in a dedicated post - with slightly different wording.
        $similar = Quiz::findSimilar($org->id, $date, $title);
        if ($similar !== null) {
            return $similar;
        }

        return Quiz::firstOrCreate(
            [
                'organization_id' => $org->id,
                'quiz_date' => $date,
                'title' => $title,
            ],
            [
                'slug' => $this->uniqueSlug($title, $date),
                'quiz_time' => $candidate['quiz_time'] ?? null,
                'location' => $candidate['location'] ?? $import->location_name ?? null,
                'address' => $candidate['address'] ?? null,
                'entry_fee' => $candidate['entry_fee'] ?? null,
                'min_team_members' => $candidate['min_team_members'] ?? 1,
                'max_team_members' => $candidate['max_team_members'] ?? 6,
                'contact_phone' => $candidate['contact_phone'] ?? null,
                'description' => $import->caption,
                'cover_image_url' => $localImageUrl,
                'instagram_post_url' => $import->instagram_post_url,
                'status' => 'published',
            ]
        );
    }

    private function uniqueSlug(string $title, string $date): string
    {
        $base = Str::slug($title . '-' . $date);
        $slug = $base;
        $counter = 1;

        while (Quiz::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function downloadAndStoreImage(string $imageUrl, string $identifier): ?string
    {
        try {
            $response = Http::timeout(30)->get($imageUrl);

            if (!$response->successful()) {
                Log::warning("Instagram sync: failed to download image for {$identifier}", ['status' => $response->status()]);
                return null;
            }

            $contentType = $response->header('Content-Type') ?? '';
            $extension = match (true) {
                str_contains($contentType, 'png') => 'png',
                str_contains($contentType, 'webp') => 'webp',
                default => 'jpg',
            };

            $filename = "quiz-images/{$identifier}.{$extension}";
            Storage::disk('public')->put($filename, $response->body());

            return Storage::disk('public')->url($filename);
        } catch (\Throwable $e) {
            Log::warning("Instagram sync: exception downloading image for {$identifier}", ['error' => $e->getMessage()]);
            return null;
        }
    }
}

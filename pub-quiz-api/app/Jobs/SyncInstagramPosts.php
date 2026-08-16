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

    /**
     * From this many quizzes in one post it is a listing rather than an
     * announcement, so its caption and cover art describe none of them.
     */
    private const SCHEDULE_MIN_QUIZZES = 5;

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

        $touched = [];

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
            $touched[] = $import->id;
        }

        $this->retryDeferred($touched, $org, $extractor);
    }

    /**
     * Instagram hands back the newest posts first, so a cancellation is seen
     * before the announcement it refers to and gets deferred for want of a quiz
     * to cancel. Everything has been imported by the end of the pass, so give
     * those one more go rather than leaving the quiz live until tomorrow.
     *
     * @param  array<int, string>  $importIds
     */
    private function retryDeferred(array $importIds, Organization $org, QuizExtractionService $extractor): void
    {
        if ($importIds === []) {
            return;
        }

        $deferred = InstagramImport::whereIn('id', $importIds)->where('status', 'pending')->get();

        foreach ($deferred as $import) {
            Log::info("Instagram sync: second pass for {$import->instagram_post_id}");
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

            // A monthly repertoire lists dozens of unrelated themes; its caption
            // and cover art describe none of them, so copying those onto every
            // entry would show 20 identical cards captioned about other quizzes.
            //
            // Announcing one recurring quiz on two or three dates is not that:
            // "GEEKS WHO DRINK, sreda i subota" comes with artwork that really
            // does belong to both evenings. Counting any multi-date post as a
            // schedule threw that artwork away, which is why several quizzes
            // showed a blank card while their picture sat right there on Instagram.
            $isSchedule = count($candidates) >= self::SCHEDULE_MIN_QUIZZES;

            $localImageUrl = (!$isSchedule && $import->image_url)
                ? $this->downloadAndStoreImage($import->image_url, $import->instagram_post_id)
                : null;
            $description = $isSchedule ? null : $import->caption;

            // A cancellation names the quiz being called off rather than a new
            // one. It can only act on a quiz that already exists, so if the
            // announcement has not been imported yet the post stays pending and
            // the next run - by which time it will exist - applies it.
            if ($this->isCancellation($candidates)) {
                $applied = $this->applyCancellations($candidates, $org);

                if ($applied) {
                    $import->status = 'processed';
                    $import->error_message = null;
                } elseif ($this->isStillRelevant($candidates)) {
                    // The announcement it refers to has probably not been imported
                    // yet; the second pass, or tomorrow's run, will catch it.
                    $import->status = 'pending';
                    $import->error_message = 'Cancellation has no matching quiz yet; will retry';
                } else {
                    // Only past dates left. Either the quiz was never imported or
                    // this was a misread of some unrelated post - retrying forever
                    // would burn an AI call a day and never resolve.
                    $import->status = 'skipped';
                    $import->error_message = 'Cancellation refers only to past dates; giving up';
                    Log::info("Instagram sync: stale cancellation dropped for {$import->instagram_post_id}");
                }

                $import->save();

                return;
            }

            $created = 0;
            $enriched = 0;
            $firstQuizId = null;

            foreach ($candidates as $candidate) {
                $quiz = $this->createQuiz($candidate, $org, $import, $localImageUrl, $description);
                $firstQuizId ??= $quiz->id;

                if ($quiz->wasRecentlyCreated) {
                    $created++;
                    Log::info("Instagram sync: created quiz '{$quiz->title}' ({$quiz->quiz_date})");
                } elseif ($this->enrich($quiz, $candidate, $localImageUrl, $description)) {
                    $enriched++;
                    Log::info("Instagram sync: enriched quiz '{$quiz->title}' ({$quiz->quiz_date})");
                } else {
                    Log::info("Instagram sync: duplicate skipped '{$quiz->title}' ({$quiz->quiz_date})");
                }
            }

            $import->quiz_id = $firstQuizId;
            $import->status = 'processed';
            $import->save();

            Log::info("Instagram sync: post {$import->instagram_post_id} produced {$created} new quiz(es), enriched {$enriched}");
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
        ?string $localImageUrl,
        ?string $description
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
                'min_team_members' => $candidate['min_team_members'] ?? null,
                'max_team_members' => $candidate['max_team_members'] ?? null,
                'contact_phone' => $candidate['contact_phone'] ?? null,
                'description' => $description,
                'cover_image_url' => $localImageUrl,
                'instagram_post_url' => $import->instagram_post_url,
                'status' => 'published',
            ]
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $candidates
     */
    private function isCancellation(array $candidates): bool
    {
        foreach ($candidates as $candidate) {
            if (($candidate['is_cancelled'] ?? false) === true) {
                return true;
            }
        }

        return false;
    }

    /**
     * Is there still anything worth cancelling? A quiz whose date has passed is
     * already off the upcoming list, so deferring the post achieves nothing.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     */
    private function isStillRelevant(array $candidates): bool
    {
        $today = now()->toDateString();

        foreach ($candidates as $candidate) {
            $date = $candidate['quiz_date'] ?? null;
            if (is_string($date) && $date >= $today) {
                return true;
            }
        }

        return false;
    }

    /**
     * Mark the named quizzes as cancelled so they drop off the site.
     * Returns false when none of them could be found, which means the
     * announcement has not been imported yet and we should try again later.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     */
    private function applyCancellations(array $candidates, Organization $org): bool
    {
        $applied = false;

        foreach ($candidates as $candidate) {
            $date = $candidate['quiz_date'] ?? null;
            $title = $candidate['title'] ?? null;
            if (!is_string($date)) {
                continue;
            }

            $quiz = is_string($title) && $title !== ''
                ? Quiz::findSimilar($org->id, $date, $title)
                : null;

            // Fall back to the only quiz that organization runs that day.
            if ($quiz === null) {
                $sameDay = Quiz::where('organization_id', $org->id)->whereDate('quiz_date', $date)->get();
                $quiz = $sameDay->count() === 1 ? $sameDay->first() : null;
            }

            if ($quiz === null) {
                Log::warning('Instagram sync: cancellation with no matching quiz', [
                    'org' => $org->slug,
                    'quiz_date' => $date,
                    'title' => $title,
                ]);
                continue;
            }

            if ($quiz->status !== 'cancelled') {
                $quiz->update(['status' => 'cancelled']);
                Log::info("Instagram sync: cancelled quiz '{$quiz->title}' ({$quiz->quiz_date})");
            }

            $applied = true;
        }

        return $applied;
    }

    /**
     * A quiz first seen in a monthly schedule has no artwork and no description.
     * When the dedicated post for that evening turns up later, fill in what is
     * still missing. Only empty fields are written, so a specific announcement
     * is never overwritten by a vaguer one.
     */
    private function enrich(
        Quiz $quiz,
        array $candidate,
        ?string $localImageUrl,
        ?string $description
    ): bool {
        $fill = [
            'quiz_time' => $candidate['quiz_time'] ?? null,
            'location' => $candidate['location'] ?? null,
            'address' => $candidate['address'] ?? null,
            'entry_fee' => $candidate['entry_fee'] ?? null,
            'min_team_members' => $candidate['min_team_members'] ?? null,
            'max_team_members' => $candidate['max_team_members'] ?? null,
            'contact_phone' => $candidate['contact_phone'] ?? null,
            'description' => $description,
            'cover_image_url' => $localImageUrl,
        ];

        $updates = [];
        foreach ($fill as $field => $value) {
            if ($value !== null && $quiz->{$field} === null) {
                $updates[$field] = $value;
            }
        }

        if ($updates === []) {
            return false;
        }

        $quiz->update($updates);

        return true;
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

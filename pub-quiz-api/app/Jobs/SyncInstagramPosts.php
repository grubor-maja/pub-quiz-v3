<?php

namespace App\Jobs;

use App\Models\InstagramImport;
use App\Models\Organization;
use App\Models\Quiz;
use App\Services\ApifyService;
use App\Services\QuizExtractionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SyncInstagramPosts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(ApifyService $apify, QuizExtractionService $extractor): void
    {
        $organizations = Organization::whereNotNull('instagram_handle')->get();

        if ($organizations->isEmpty()) {
            Log::info('Instagram sync: no organizations with instagram_handle');
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
                    'posted_at' => isset($post['timestamp']) ? date('Y-m-d H:i:s', $post['timestamp']) : null,
                    'raw_data' => $post,
                    'organization_id' => $org->id,
                    'status' => 'pending',
                ]
            );

            if (!$import->wasRecentlyCreated || $import->status !== 'pending') {
                continue;
            }

            $this->processImport($import, $org, $extractor);
        }
    }

    private function processImport(
        InstagramImport $import,
        Organization $org,
        QuizExtractionService $extractor
    ): void {
        try {
            $caption = $import->caption ?? '';
            $postDate = $import->posted_at?->format('Y-m-d') ?? now()->format('Y-m-d');

            $extracted = $extractor->extract($caption, $postDate);
            $import->extracted_data = $extracted;

            if (empty($extracted['quiz_date'])) {
                $import->status = 'skipped';
                $import->save();
                return;
            }

            $title = $extracted['title'] ?? "Kviz {$org->name} {$extracted['quiz_date']}";
            $slug = Str::slug($title . '-' . $extracted['quiz_date']);

            // Ensure unique slug
            $baseSlug = $slug;
            $counter = 1;
            while (Quiz::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }

            $quiz = Quiz::create([
                'organization_id' => $org->id,
                'title' => $title,
                'slug' => $slug,
                'quiz_date' => $extracted['quiz_date'],
                'quiz_time' => $extracted['quiz_time'] ?? null,
                'location' => $extracted['location'] ?? null,
                'address' => $extracted['address'] ?? null,
                'entry_fee' => $extracted['entry_fee'] ?? null,
                'min_team_members' => $extracted['min_team_members'] ?? 1,
                'max_team_members' => $extracted['max_team_members'] ?? 6,
                'contact_phone' => $extracted['contact_phone'] ?? null,
                'cover_image_url' => $import->image_url,
                'instagram_post_url' => $import->instagram_post_url,
                'status' => 'published',
            ]);

            $import->quiz_id = $quiz->id;
            $import->status = 'processed';
            $import->save();

            Log::info("Instagram sync: created quiz '{$quiz->title}'");
        } catch (\Throwable $e) {
            $import->status = 'failed';
            $import->error_message = $e->getMessage();
            $import->save();
            Log::error("Instagram sync: failed to process import {$import->id}", ['error' => $e->getMessage()]);
        }
    }
}

<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fetches Instagram posts through an Apify actor.
 *
 * Different actors want different input and hand back different field names, so
 * the actor-specific parts live here and everything downstream sees one shape.
 * That matters because the price per post varies by a factor of five between
 * actors, and the free tier is small enough that switching is worth doing.
 */
class ApifyService
{
    /** Canonical keys the rest of the application expects on every post. */
    private const OUTPUT_ALIASES = [
        'id' => ['id', 'postId', 'pk', 'shortCode', 'code'],
        'shortCode' => ['shortCode', 'shortcode', 'code'],
        'url' => ['url', 'postUrl', 'link', 'permalink'],
        'caption' => ['caption', 'text', 'description', 'title'],
        'displayUrl' => ['displayUrl', 'imageUrl', 'image', 'thumbnailUrl', 'displayUri', 'thumbnail'],
        'ownerUsername' => ['ownerUsername', 'username', 'owner.username', 'user.username', 'ownerName'],
        'locationName' => ['locationName', 'location.name', 'location'],
        'timestamp' => ['timestamp', 'takenAt', 'takenAtTimestamp', 'createdAt', 'date', 'publishedAt'],
    ];

    private string $token;
    private string $actorId;

    public function __construct()
    {
        $this->token = (string) config('services.apify.token');
        $this->actorId = (string) config('services.apify.actor_id');
    }

    /**
     * @return array<int, array<string, mixed>> posts in the canonical shape
     */
    public function fetchPostsForHandle(string $instagramHandle, ?int $limit = null): array
    {
        $limit ??= (int) config('services.apify.post_limit', 12);
        $url = "https://api.apify.com/v2/acts/{$this->actorId}/run-sync-get-dataset-items";

        $response = Http::withToken($this->token)
            ->timeout(300)
            ->post($url, $this->buildInput($instagramHandle, $limit));

        if (!$response->successful()) {
            Log::error('Apify request failed', [
                'handle' => $instagramHandle,
                'actor' => $this->actorId,
                'status' => $response->status(),
                // 402 here means the monthly free credit is spent, not a bug.
                'body' => mb_substr($response->body(), 0, 400),
            ]);

            return [];
        }

        $items = $response->json() ?? [];

        return $this->normalize(is_array($items) ? $items : []);
    }

    /**
     * Actors disagree on input. apify/instagram-scraper takes directUrls and
     * resultsLimit; apidojo/instagram-scraper takes startUrls and maxItems and
     * rejects the former outright.
     *
     * @return array<string, mixed>
     */
    private function buildInput(string $handle, int $limit): array
    {
        $profileUrl = "https://www.instagram.com/{$handle}/";

        if ($this->isApidojo()) {
            return [
                'startUrls' => [$profileUrl],
                'maxItems' => $limit,
            ];
        }

        return [
            'directUrls' => [$profileUrl],
            'resultsType' => 'posts',
            'resultsLimit' => $limit,
            'addParentData' => false,
            'onlyPostsNewerThan' => now()->subMonths(6)->format('Y-m-d'),
        ];
    }

    private function isApidojo(): bool
    {
        // Accepts the slug form and the opaque id the platform also accepts.
        return str_contains($this->actorId, 'apidojo')
            || $this->actorId === 'culc72xb7MP3EbaeX';
    }

    /**
     * Rename whatever the actor produced into the canonical keys, so swapping
     * actors never ripples into the sync job or the extractors.
     *
     * @param  array<int, mixed>  $items
     * @return array<int, array<string, mixed>>
     */
    private function normalize(array $items): array
    {
        $posts = [];

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $post = $item;
            foreach (self::OUTPUT_ALIASES as $canonical => $aliases) {
                $value = $this->firstPresent($item, $aliases);
                if ($value !== null) {
                    $post[$canonical] = $value;
                }
            }

            // A post with no identifier cannot be de-duplicated on re-sync, and
            // one with no caption carries nothing to extract a quiz from.
            if (($post['id'] ?? null) === null && ($post['shortCode'] ?? null) === null) {
                continue;
            }

            $post['url'] ??= isset($post['shortCode'])
                ? "https://www.instagram.com/p/{$post['shortCode']}/"
                : null;

            $posts[] = $post;
        }

        return $posts;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<int, string>  $aliases  may use dot notation for nesting
     */
    private function firstPresent(array $item, array $aliases): mixed
    {
        foreach ($aliases as $alias) {
            $value = data_get($item, $alias);

            if ($value === null || $value === '') {
                continue;
            }

            // location may arrive as a string or as an object; take the name.
            if (is_array($value)) {
                $value = $value['name'] ?? $value['username'] ?? null;
                if ($value === null || $value === '') {
                    continue;
                }
            }

            return $value;
        }

        return null;
    }
}

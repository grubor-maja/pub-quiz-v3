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
        // apidojo nests the picture as image.url and, for reels, video.thumbnail.
        'displayUrl' => ['displayUrl', 'image.url', 'imageUrl', 'thumbnailUrl', 'displayUri', 'video.thumbnail', 'image', 'thumbnail'],
        'ownerUsername' => ['ownerUsername', 'username', 'owner.username', 'user.username', 'ownerName'],
        'locationName' => ['locationName', 'location.name', 'location'],
        'timestamp' => ['timestamp', 'takenAt', 'takenAtTimestamp', 'createdAt', 'date', 'publishedAt'],
    ];

    /** Where each actor hides the slides of a carousel post. */
    private const CAROUSEL_KEYS = ['childPosts', 'carouselMedia', 'sidecarMedia', 'images'];

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

            // A post with no identifier cannot be de-duplicated on re-sync.
            if (($post['id'] ?? null) === null && ($post['shortCode'] ?? null) === null) {
                continue;
            }

            // When an actor cannot reach an account's posts it answers with the
            // profile instead, which carries a user id and so passes the check
            // above. Left alone it becomes a post with no caption and no image,
            // and the sync reports "no quiz found" for a reason that has nothing
            // to do with the account's content.
            if (!$this->looksLikePost($post)) {
                Log::warning('Apify returned a non-post item, probably a profile', [
                    'username' => $post['username'] ?? $post['ownerUsername'] ?? null,
                    'keys' => array_slice(array_keys($item), 0, 12),
                ]);

                continue;
            }

            $post['url'] ??= isset($post['shortCode'])
                ? "https://www.instagram.com/p/{$post['shortCode']}/"
                : null;

            $post['carouselImages'] = self::carouselImages($item);

            $posts[] = $post;
        }

        return $posts;
    }

    /**
     * A real post carries its own short code, or at least something to read:
     * a caption or a picture. A profile object has neither.
     *
     * @param  array<string, mixed>  $post
     */
    private function looksLikePost(array $post): bool
    {
        return ($post['shortCode'] ?? null) !== null
            || trim((string) ($post['caption'] ?? '')) !== ''
            || ($post['displayUrl'] ?? null) !== null;
    }

    /**
     * Slide images of a carousel post, in the order they appear.
     *
     * Organizers have started putting a week of quizzes in one post, one per
     * slide. Instagram caps a caption at 2200 characters, which is not enough
     * room to describe them all, so the later quizzes exist only as pictures.
     * Keeping the slides is what makes those recoverable.
     *
     * Public and static so the sync job can run it over the raw payload of
     * posts scraped before this normalisation existed. Those already hold the
     * slides under the actor's own key, and re-reading them costs nothing,
     * while scraping them again would.
     *
     * @param  array<string, mixed>  $item
     * @return array<int, string>
     */
    public static function carouselImages(array $item): array
    {
        foreach (self::CAROUSEL_KEYS as $key) {
            $slides = $item[$key] ?? null;
            if (!is_array($slides) || $slides === []) {
                continue;
            }

            $urls = [];
            foreach ($slides as $slide) {
                $url = is_string($slide)
                    ? $slide
                    : self::pick((array) $slide, ['displayUrl', 'url', 'image.url', 'imageUrl']);

                if (is_string($url) && str_starts_with($url, 'http')) {
                    $urls[] = $url;
                }
            }

            if ($urls !== []) {
                return array_values(array_unique($urls));
            }
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<int, string>  $aliases  may use dot notation for nesting
     */
    private function firstPresent(array $item, array $aliases): mixed
    {
        return self::pick($item, $aliases);
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<int, string>  $aliases  may use dot notation for nesting
     */
    private static function pick(array $item, array $aliases): mixed
    {
        foreach ($aliases as $alias) {
            $value = data_get($item, $alias);

            if ($value === null || $value === '') {
                continue;
            }

            // Some fields arrive as a string on one actor and an object on
            // another - location as {name,lat,lng}, image as {url,width,height}.
            if (is_array($value)) {
                $value = $value['name'] ?? $value['username'] ?? $value['url'] ?? null;
                if ($value === null || $value === '') {
                    continue;
                }
            }

            return $value;
        }

        return null;
    }
}

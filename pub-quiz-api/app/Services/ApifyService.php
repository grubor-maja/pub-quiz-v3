<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ApifyService
{
    private string $token;
    private string $actorId;

    public function __construct()
    {
        $this->token = config('services.apify.token');
        $this->actorId = config('services.apify.actor_id');
    }

    public function fetchPostsForHandle(string $instagramHandle, int $limit = 15): array
    {
        $url = "https://api.apify.com/v2/acts/{$this->actorId}/run-sync-get-dataset-items";

        $response = Http::withToken($this->token)
            ->timeout(300)
            ->post($url, [
                'directUrls' => ["https://www.instagram.com/{$instagramHandle}/"],
                'resultsType' => 'posts',
                'resultsLimit' => $limit,
                'addParentData' => false,
                'onlyPostsNewerThan' => now()->subMonths(6)->format('Y-m-d'),
            ]);

        if (!$response->successful()) {
            Log::error('Apify request failed', [
                'handle' => $instagramHandle,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return [];
        }

        return $response->json() ?? [];
    }
}

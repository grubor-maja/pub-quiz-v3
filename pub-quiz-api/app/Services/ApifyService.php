<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ApifyService
{
    private string $token;
    private string $actorId;
    private string $datasetId;

    public function __construct()
    {
        $this->token = config('services.apify.token');
        $this->actorId = config('services.apify.actor_id');
        $this->datasetId = config('services.apify.dataset_id');
    }

    public function fetchPostsForHandle(string $instagramHandle, int $limit = 20): array
    {
        $response = Http::withToken($this->token)
            ->timeout(120)
            ->post("https://api.apify.com/v2/acts/{$this->actorId}/run-sync-get-dataset-items", [
                'directUrls' => ["https://www.instagram.com/{$instagramHandle}/"],
                'resultsLimit' => $limit,
                'addParentData' => false,
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

    public function fetchDataset(): array
    {
        $response = Http::withToken($this->token)
            ->get("https://api.apify.com/v2/datasets/{$this->datasetId}/items", [
                'limit' => 100,
                'clean' => true,
            ]);

        if (!$response->successful()) {
            Log::error('Apify dataset fetch failed', ['status' => $response->status()]);
            return [];
        }

        return $response->json() ?? [];
    }
}

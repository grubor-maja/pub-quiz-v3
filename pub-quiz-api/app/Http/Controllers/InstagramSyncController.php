<?php

namespace App\Http\Controllers;

use App\Jobs\SyncInstagramPosts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstagramSyncController extends Controller
{
    public function sync(Request $request): JsonResponse
    {
        $apiKey = $request->header('X-Api-Key');

        if ($apiKey !== config('services.sync_api_key')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        dispatch(new SyncInstagramPosts());

        return response()->json(['message' => 'Sync started']);
    }
}

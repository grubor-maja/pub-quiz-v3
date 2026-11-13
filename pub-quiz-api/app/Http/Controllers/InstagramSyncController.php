<?php

namespace App\Http\Controllers;

use App\Jobs\SyncInstagramPosts;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstagramSyncController extends Controller
{
    public function sync(Request $request): JsonResponse
    {
        $expected = (string) config('services.sync_api_key');
        $given = (string) $request->header('X-Api-Key', '');

        // An unset key on the server must not mean "no key needed", and
        // hash_equals keeps the comparison from leaking the key through timing.
        if ($expected === '' || ! hash_equals($expected, $given)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        dispatch(new SyncInstagramPosts());
        Audit::record('sync.triggered');

        return response()->json(['message' => 'Sync started']);
    }
}

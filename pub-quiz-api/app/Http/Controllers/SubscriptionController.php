<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $orgs = $user->subscribedOrganizations()
            ->withCount('publishedQuizzes')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $orgs]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        $org = Organization::where('slug', $slug)->firstOrFail();

        $user->subscribedOrganizations()->syncWithoutDetaching([$org->id]);

        return response()->json(['message' => 'Pratite organizaciju.']);
    }

    public function destroy(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        $org = Organization::where('slug', $slug)->firstOrFail();

        $user->subscribedOrganizations()->detach($org->id);

        return response()->json(['message' => 'Prestali ste da pratite organizaciju.']);
    }
}

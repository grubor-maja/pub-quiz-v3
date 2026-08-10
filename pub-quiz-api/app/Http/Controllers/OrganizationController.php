<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\JsonResponse;

class OrganizationController extends Controller
{
    public function index(): JsonResponse
    {
        $organizations = Organization::withCount('publishedQuizzes')
            ->orderBy('name')
            ->get();

        $user = auth('sanctum')->user();
        if ($user) {
            $subscribedIds = array_flip($user->subscribedOrganizations()->pluck('organizations.id')->all());
            $organizations->transform(function (Organization $o) use ($subscribedIds) {
                $o->is_subscribed = isset($subscribedIds[$o->id]);
                return $o;
            });
        }

        return response()->json($organizations);
    }

    public function show(string $slug): JsonResponse
    {
        $organization = Organization::where('slug', $slug)
            ->withCount('publishedQuizzes')
            ->firstOrFail();

        $quizzes = $organization->publishedQuizzes()
            ->orderBy('quiz_date', 'desc')
            ->get();

        $user = auth('sanctum')->user();
        $organization->is_subscribed = $user
            ? $user->subscribedOrganizations()->where('organizations.id', $organization->id)->exists()
            : false;

        return response()->json([
            'organization' => $organization,
            'quizzes' => $quizzes,
        ]);
    }
}

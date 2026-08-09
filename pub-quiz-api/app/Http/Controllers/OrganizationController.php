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

        return response()->json([
            'organization' => $organization,
            'quizzes' => $quizzes,
        ]);
    }
}

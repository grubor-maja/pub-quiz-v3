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
        $organization = Organization::where('slug', $slug)->firstOrFail();

        return response()->json($organization);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoritesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $quizzes = $user->favorites()
            ->with('organization:id,name,slug,logo_url')
            ->orderBy('favorites.created_at', 'desc')
            ->get()
            ->map(function (Quiz $quiz) {
                $quiz->is_favorited = true;

                return $quiz;
            });

        return response()->json([
            'data' => $quizzes,
        ]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $quiz = Quiz::where('slug', $slug)->firstOrFail();

        $user = $request->user();

        $user->favorites()->syncWithoutDetaching([$quiz->id]);

        return response()->json([
            'message' => 'Dodato u favorite.',
        ]);
    }

    public function destroy(Request $request, string $slug): JsonResponse
    {
        $quiz = Quiz::where('slug', $slug)->firstOrFail();

        $user = $request->user();

        $user->favorites()->detach($quiz->id);

        return response()->json([
            'message' => 'Uklonjeno iz favorita.',
        ]);
    }
}

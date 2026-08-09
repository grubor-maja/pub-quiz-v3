<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class QuizController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Quiz::published()
            ->with('organization:id,name,slug,logo_url')
            ->orderBy('quiz_date', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('org')) {
            $query->whereHas('organization', fn ($q) => $q->where('slug', $request->input('org')));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('quiz_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('quiz_date', '<=', $request->input('date_to'));
        }

        $paginator = $query->paginate(20);

        $user = auth('sanctum')->user();
        if ($user) {
            $quizIds = collect($paginator->items())->pluck('id')->all();
            $favoritedIds = $user->favorites()->whereIn('quizzes.id', $quizIds)->pluck('quizzes.id')->all();
            $favoritedSet = array_flip($favoritedIds);

            $paginator->getCollection()->transform(function (Quiz $quiz) use ($favoritedSet) {
                $quiz->is_favorited = isset($favoritedSet[$quiz->id]);

                return $quiz;
            });
        } else {
            $paginator->getCollection()->transform(function (Quiz $quiz) {
                $quiz->is_favorited = false;

                return $quiz;
            });
        }

        return response()->json($paginator);
    }

    public function show(string $slug): JsonResponse
    {
        $quiz = Quiz::published()
            ->with('organization:id,name,slug,logo_url,instagram_handle,description')
            ->where('slug', $slug)
            ->firstOrFail();

        $user = auth('sanctum')->user();
        $quiz->is_favorited = $user
            ? $user->favorites()->where('quizzes.id', $quiz->id)->exists()
            : false;

        return response()->json($quiz);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json($query->paginate(20));
    }

    public function show(string $slug): JsonResponse
    {
        $quiz = Quiz::published()
            ->with('organization:id,name,slug,logo_url,instagram_handle,description')
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json($quiz);
    }
}

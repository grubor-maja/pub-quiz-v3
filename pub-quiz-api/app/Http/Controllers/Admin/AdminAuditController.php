<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\Quiz;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use App\Support\Like;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Site admin only: who changed what, and undo for an accidental quiz delete. */
class AdminAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'action' => ['nullable', 'string', 'max:64'],
            'subject_type' => ['nullable', 'string', 'max:32'],
            'user_id' => ['nullable', 'integer'],
            'organization_id' => ['nullable', 'string', 'max:64'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = AuditLog::query()->orderByDesc('created_at')->orderByDesc('id');

        if ($request->filled('search')) {
            $search = Like::contains($request->input('search'));
            $query->where(fn ($q) => $q
                ->where('user_name', 'like', $search)
                ->orWhere('user_email', 'like', $search)
                ->orWhere('subject_label', 'like', $search));
        }
        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }
        if ($request->filled('subject_type')) {
            $query->where('subject_type', $request->input('subject_type'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->input('user_id'));
        }
        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->input('organization_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $page = $query->paginate(40);

        // Tells the page which deleted quizzes can still be brought back.
        $deletedIds = $page->getCollection()
            ->where('action', 'quiz.deleted')
            ->pluck('subject_id')
            ->all();
        $stillGone = array_diff($deletedIds, Quiz::whereIn('id', $deletedIds)->pluck('id')->all());
        $page->getCollection()->each(function (AuditLog $log) use ($stillGone) {
            $log->setAttribute('restorable', $log->action === 'quiz.deleted' && in_array($log->subject_id, $stillGone, true));
        });

        return response()->json($page);
    }

    /** Recreates a deleted quiz from the snapshot its delete entry holds. */
    public function restore(int $id): JsonResponse
    {
        $log = AuditLog::findOrFail($id);

        if ($log->action !== 'quiz.deleted' || ! is_array($log->changes)) {
            return response()->json(['message' => 'Samo obrisan kviz može da se vrati.'], 422);
        }
        if (Quiz::whereKey($log->subject_id)->exists()) {
            return response()->json(['message' => 'Kviz je već vraćen.'], 422);
        }

        $data = $log->changes;
        if (! Organization::whereKey($data['organization_id'] ?? null)->exists()) {
            return response()->json(['message' => 'Organizacija ovog kviza više ne postoji.'], 422);
        }

        // The old slug may have been taken since, by a new quiz with the same title.
        $slug = $data['slug'] ?? Str::slug($data['title'] ?? 'kviz');
        $base = $slug;
        $n = 1;
        while (Quiz::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }
        $data['slug'] = $slug;

        $quiz = new Quiz;
        $quiz->forceFill(array_intersect_key($data, array_flip(array_merge(
            $quiz->getFillable(), ['id', 'latitude', 'longitude']
        ))));
        $quiz->save();

        Audit::record('quiz.restored', $quiz, ['iz_zapisa' => $log->id]);

        return response()->json($quiz->load('organization:id,name,slug'));
    }
}

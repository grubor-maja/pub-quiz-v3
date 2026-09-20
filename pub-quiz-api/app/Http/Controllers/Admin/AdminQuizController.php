<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminQuizController extends Controller
{
    private const STATUSES = ['published', 'draft', 'completed', 'cancelled'];

    /**
     * Unlike the public listing this shows every status and both past and
     * future, because fixing a quiz usually starts from noticing it is wrong.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Quiz::with('organization:id,name,slug')
            ->orderByDesc('quiz_date');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%"));
        }

        if ($request->filled('org')) {
            $query->whereHas('organization', fn ($q) => $q->where('slug', $request->input('org')));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate(30));
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Quiz::with('organization:id,name,slug')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        $data['slug'] = $this->uniqueSlug($data['title'], $data['quiz_date'] ?? null);
        $data['status'] ??= 'published';

        $quiz = Quiz::create($data);

        return response()->json($quiz->load('organization:id,name,slug'), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $quiz = Quiz::findOrFail($id);
        $data = $request->validate($this->rules(partial: true));

        // The slug is part of the public URL, so it is only regenerated when
        // the title actually changes. Otherwise a small typo fix would break
        // every link and bookmark pointing at the quiz.
        if (isset($data['title']) && $data['title'] !== $quiz->title) {
            $data['slug'] = $this->uniqueSlug(
                $data['title'],
                $data['quiz_date'] ?? $quiz->quiz_date?->format('Y-m-d'),
                $quiz->id
            );
        }

        $quiz->update($data);

        return response()->json($quiz->fresh()->load('organization:id,name,slug'));
    }

    public function destroy(string $id): JsonResponse
    {
        $quiz = Quiz::findOrFail($id);

        // Detaching first keeps the quiz from vanishing out of someone's
        // favourites through a cascade they never see.
        $quiz->favoritedBy()->detach();
        $quiz->delete();

        return response()->json(['message' => 'Kviz obrisan.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'organization_id' => [$required, 'uuid', 'exists:organizations,id'],
            'title' => [$required, 'string', 'min:2', 'max:255'],
            'quiz_date' => ['nullable', 'date'],
            'quiz_time' => ['nullable', 'date_format:H:i'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'entry_fee' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'min_team_members' => ['nullable', 'integer', 'min:1', 'max:255'],
            'max_team_members' => ['nullable', 'integer', 'min:1', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:255'],
            'cover_image_url' => ['nullable', 'string', 'max:2000'],
            'instagram_post_url' => ['nullable', 'string', 'max:2000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
        ];
    }

    private function uniqueSlug(string $title, ?string $date, ?string $ignoreId = null): string
    {
        $base = Str::slug($title . ($date ? '-' . substr($date, 0, 10) : ''));
        $base = $base !== '' ? $base : 'kviz';
        $slug = $base;
        $n = 1;

        while (Quiz::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}

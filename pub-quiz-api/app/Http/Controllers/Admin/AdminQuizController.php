<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Services\Audit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use App\Support\Like;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminQuizController extends Controller
{
    private const STATUSES = ['published', 'draft', 'completed', 'cancelled'];

    /**
     * http(s) or a path on this site. Rejects javascript:, data: and the
     * like, which would otherwise end up in og:image and the page markup.
     */
    public const SAFE_URL = '#^(https?://[^\s]+|/(?!/)[^\s]*)$#i';

    /**
     * Unlike the public listing this shows every status and both past and
     * future, because fixing a quiz usually starts from noticing it is wrong.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'org' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->scoped($request)
            ->with('organization:id,name,slug')
            ->orderByDesc('quiz_date');

        if ($request->filled('search')) {
            $search = Like::contains($request->input('search'));
            $query->where(fn ($q) => $q
                ->where('title', 'like', $search)
                ->orWhere('location', 'like', $search));
        }

        if ($request->filled('org')) {
            $query->whereHas('organization', fn ($q) => $q->where('slug', $request->input('org')));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate(30));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json($this->scoped($request)->with('organization:id,name,slug')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $this->authorizeOrganization($request, $data['organization_id']);

        $data['slug'] = $this->uniqueSlug($data['title'], $data['quiz_date'] ?? null);
        $data['status'] ??= 'published';
        $this->requireDateWhenPublished($data['status'], $data['quiz_date'] ?? null);

        $quiz = Quiz::create($data);
        Audit::record('quiz.created', $quiz, Audit::snapshot($quiz));

        return response()->json($quiz->load('organization:id,name,slug'), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $quiz = $this->scoped($request)->findOrFail($id);
        $data = $request->validate($this->rules(partial: true));

        // Moving a quiz to another organization needs rights over both.
        if (isset($data['organization_id'])) {
            $this->authorizeOrganization($request, $data['organization_id']);
        }

        // The slug is the public URL and stays what it was when the quiz was
        // created, whatever the title becomes. Links already shared on Viber
        // and Instagram keep working; the page shows the current title.
        $this->requireDateWhenPublished(
            $data['status'] ?? $quiz->status,
            array_key_exists('quiz_date', $data) ? $data['quiz_date'] : $quiz->quiz_date
        );

        $before = $quiz->getRawOriginal();
        $quiz->update($data);
        $changes = Audit::diff($quiz, $before);
        if ($changes !== []) {
            Audit::record('quiz.updated', $quiz, $changes);
        }

        return response()->json($quiz->fresh()->load('organization:id,name,slug'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $quiz = $this->scoped($request)->findOrFail($id);

        // The full row goes into the log, which is what makes "Vrati" on the
        // audit page possible after an accidental delete.
        Audit::record('quiz.deleted', $quiz, Audit::snapshot($quiz));

        // Detaching first keeps the quiz from vanishing out of someone's
        // favourites through a cascade they never see.
        $quiz->favoritedBy()->detach();
        $quiz->delete();

        return response()->json(['message' => 'Kviz obrisan.']);
    }

    /**
     * Quizzes the caller may see and change. An organization admin gets only
     * their organizations' quizzes, so another organization's quiz id answers
     * 404 exactly like one that does not exist.
     */
    private function scoped(Request $request): Builder
    {
        $ids = $request->user()->manageableOrganizationIds();

        return Quiz::query()->when($ids !== null, fn ($q) => $q->whereIn('organization_id', $ids));
    }

    private function authorizeOrganization(Request $request, string $organizationId): void
    {
        if (! $request->user()->canManageOrganization($organizationId)) {
            abort(response()->json([
                'message' => 'Nemate pravo na tu organizaciju.',
                'errors' => ['organization_id' => ['Nemate pravo na tu organizaciju.']],
            ], 422));
        }
    }

    /**
     * A published quiz without a date cannot be attended, and its calendar
     * file had to invent one. Drafts and cancelled quizzes may go without.
     */
    private function requireDateWhenPublished(?string $status, mixed $date): void
    {
        if ($status === 'published' && ($date === null || $date === '')) {
            abort(response()->json([
                'message' => 'Objavljen kviz mora imati datum.',
                'errors' => ['quiz_date' => ['Objavljen kviz mora imati datum. Unesi datum ili sačuvaj kao draft.']],
            ], 422));
        }
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
            'cover_image_url' => ['nullable', 'string', 'max:2000', 'regex:' . self::SAFE_URL],
            'instagram_post_url' => ['nullable', 'string', 'max:2000', 'regex:' . self::SAFE_URL],
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

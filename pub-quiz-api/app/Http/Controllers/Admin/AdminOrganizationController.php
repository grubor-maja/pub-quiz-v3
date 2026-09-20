<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\Extraction\OrganizationProfiler;
use App\Services\QuizExtractionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Adding an organization used to mean an SSH session and a tinker one-liner,
 * which is also why the production database ended up with different slugs from
 * the local one. This puts it behind a form.
 */
class AdminOrganizationController extends Controller
{
    public function index(): JsonResponse
    {
        $orgs = Organization::withCount('quizzes')
            ->orderBy('name')
            ->get()
            // The extraction defaults are hidden from the public API, but this
            // is the one place they need to be visible and editable.
            ->makeVisible([
                'default_location', 'default_address', 'default_quiz_time',
                'default_entry_fee', 'default_contact_phone',
                'default_min_team_members', 'default_max_team_members',
            ]);

        return response()->json($orgs);
    }

    /**
     * Proposes an organization from an Instagram handle. Writes nothing: the
     * default_* values it guesses apply to every quiz scraped afterwards, so a
     * wrong one corrupts the future quietly. A human confirms first.
     */
    public function preview(Request $request, OrganizationProfiler $profiler): JsonResponse
    {
        $data = $request->validate([
            'instagram_handle' => ['required', 'string', 'max:255', 'regex:/^@?[A-Za-z0-9._]+$/'],
        ]);

        try {
            return response()->json($profiler->profile($data['instagram_handle']));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Runs the real extraction against a handle and returns what it would
     * create, without saving. Lets a new organization be checked before it is
     * trusted with the daily sync, which is where a bad configuration would
     * otherwise surface as quizzes quietly not appearing.
     */
    public function testSync(Request $request, QuizExtractionService $extractor): JsonResponse
    {
        $data = $request->validate([
            'instagram_handle' => ['required', 'string', 'max:255', 'regex:/^@?[A-Za-z0-9._]+$/'],
            'slug' => ['nullable', 'string', 'max:255'],
            'default_location' => ['nullable', 'string', 'max:255'],
            'default_address' => ['nullable', 'string', 'max:255'],
            'default_quiz_time' => ['nullable', 'date_format:H:i'],
            'default_entry_fee' => ['nullable', 'integer'],
            'default_contact_phone' => ['nullable', 'string', 'max:255'],
            'default_min_team_members' => ['nullable', 'integer'],
            'default_max_team_members' => ['nullable', 'integer'],
        ]);

        $handle = ltrim($data['instagram_handle'], '@');

        // An unsaved model, so the defaults being tried out do not touch the
        // database and the per-organization extractor is still selected by slug.
        $org = new Organization($data);
        $org->slug = $data['slug'] ?? 'preview';
        $org->name = $handle;
        $org->instagram_handle = $handle;

        $posts = app(\App\Services\ApifyService::class)->fetchPostsForHandle($handle, 4);

        if ($posts === []) {
            return response()->json([
                'message' => "Scraper nije vratio nijednu objavu za @{$handle}. "
                    . 'Nalog je vidljiv, ali Instagram trenutno ne daje njegove objave scraperu. '
                    . 'Probaj ponovo kasnije, ili dodaj organizaciju rucno pa kvizove unesi kroz admin.',
            ], 422);
        }

        $results = [];
        foreach ($posts as $post) {
            $postDate = isset($post['timestamp'])
                ? date('Y-m-d', strtotime((string) $post['timestamp']))
                : now()->format('Y-m-d');

            try {
                $candidates = $extractor->extract(
                    $org,
                    (string) ($post['caption'] ?? ''),
                    $postDate,
                    $post['displayUrl'] ?? null,
                    $post['carouselImages'] ?? []
                );
            } catch (\Throwable $e) {
                $candidates = [];
            }

            $results[] = [
                'posted_at' => $postDate,
                'caption' => mb_substr(preg_replace('/\s+/', ' ', (string) ($post['caption'] ?? '')), 0, 140),
                'quizzes' => array_map(fn ($c) => [
                    'title' => $c['title'] ?? null,
                    'quiz_date' => $c['quiz_date'] ?? null,
                    'quiz_time' => $c['quiz_time'] ?? null,
                    'location' => $c['location'] ?? null,
                    'entry_fee' => $c['entry_fee'] ?? null,
                ], $candidates),
            ];
        }

        return response()->json([
            'posts' => $results,
            'total_quizzes' => array_sum(array_map(fn ($r) => count($r['quizzes']), $results)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);

        $org = Organization::create($data);

        return response()->json($org, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $org = Organization::findOrFail($id);
        $data = $request->validate($this->rules(partial: true, ignoreId: $id));

        // Changing a slug changes the organization's public URL, so it is only
        // touched when explicitly sent, never derived from a renamed title.
        if (isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $id);
        }

        $org->update($data);

        return response()->json($org->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $org = Organization::withCount('quizzes')->findOrFail($id);

        // Quizzes cascade on delete, so removing an organization silently takes
        // its whole history with it. That needs saying out loud rather than
        // happening behind a single click.
        if ($org->quizzes_count > 0) {
            return response()->json([
                'message' => "Organizacija ima {$org->quizzes_count} kvizova. Obrisi ih prvo ili ih prebaci na drugu organizaciju.",
            ], 422);
        }

        $org->delete();

        return response()->json(['message' => 'Organizacija obrisana.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $partial = false, ?string $ignoreId = null): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'min:2', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/'],
            'instagram_handle' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9._]+$/'],
            'logo_url' => ['nullable', 'string', 'max:2000'],
            'description' => ['nullable', 'string'],
            'default_location' => ['nullable', 'string', 'max:255'],
            'default_address' => ['nullable', 'string', 'max:255'],
            'default_quiz_time' => ['nullable', 'date_format:H:i'],
            'default_entry_fee' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'default_contact_phone' => ['nullable', 'string', 'max:255'],
            'default_min_team_members' => ['nullable', 'integer', 'min:1', 'max:255'],
            'default_max_team_members' => ['nullable', 'integer', 'min:1', 'max:255'],
        ];
    }

    private function uniqueSlug(string $value, ?string $ignoreId = null): string
    {
        $base = Str::slug($value);
        $base = $base !== '' ? $base : 'organizacija';
        $slug = $base;
        $n = 1;

        while (Organization::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}

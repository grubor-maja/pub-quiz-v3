<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
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

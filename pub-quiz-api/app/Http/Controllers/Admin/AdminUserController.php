<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use App\Support\Like;
use Illuminate\Http\Request;

/**
 * Site admin only. Lists accounts and decides who administers which
 * organization. Site-wide admin rights are not granted here: that stays with
 * the user:make-admin command on the server, so a stolen admin session cannot
 * mint more site admins.
 */
class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'role' => ['nullable', 'string'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = User::query()
            ->with('managedOrganizations:organizations.id,organizations.name,organizations.slug')
            ->orderByDesc('is_admin')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = Like::contains($request->input('search'));
            $query->where(fn ($q) => $q
                ->where('name', 'like', $search)
                ->orWhere('email', 'like', $search));
        }

        if ($request->input('role') === 'org_admin') {
            $query->whereHas('managedOrganizations');
        } elseif ($request->input('role') === 'admin') {
            $query->where('is_admin', true);
        }

        $page = $query->paginate(30, ['id', 'name', 'email', 'is_admin', 'created_at']);
        $page->getCollection()->transform(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'is_admin' => (bool) $u->is_admin,
            'created_at' => $u->created_at,
            'managed_organizations' => $u->managedOrganizations
                ->map(fn ($o) => ['id' => $o->id, 'name' => $o->name, 'slug' => $o->slug])
                ->values(),
        ]);

        return response()->json($page);
    }

    /**
     * Replaces the set of organizations a user administers. Sending an empty
     * list removes every organization role.
     */
    public function setOrganizations(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'organization_ids' => ['present', 'array'],
            'organization_ids.*' => ['uuid', 'exists:organizations,id'],
        ]);

        $before = $user->managedOrganizations()->pluck('organizations.id')->all();
        $result = $user->managedOrganizations()->sync(array_values(array_unique($data['organization_ids'])));

        $names = fn (array $ids) => Organization::whereIn('id', $ids)->orderBy('name')->pluck('name')->all();
        $added = $names($result['attached']);
        $removed = $names($result['detached']);

        if ($added !== [] || $removed !== []) {
            Audit::record('user.roles_changed', $user, [
                'dodato' => $added,
                'uklonjeno' => $removed,
                'pre' => $names($before),
            ]);
        }

        return response()->json($user->toAuthArray());
    }
}

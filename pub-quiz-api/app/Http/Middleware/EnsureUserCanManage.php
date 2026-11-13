<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets in site admins and organization admins. Which organizations an
 * organization admin may touch is decided per record in the controllers,
 * through User::manageableOrganizationIds(); this only keeps everyone else out.
 */
class EnsureUserCanManage
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->canManageAnything()) {
            abort(404);
        }

        return $next($request);
    }
}

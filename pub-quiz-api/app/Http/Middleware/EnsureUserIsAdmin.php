<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The actual guard on every admin endpoint.
 *
 * Hiding buttons in the frontend hides nothing: the API is public and anyone
 * who reads the JavaScript bundle can see the routes. This is what stops them.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            // 404 rather than 403, so the admin surface is not advertised to
            // someone poking at the API with an ordinary account.
            abort(404);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security headers on every response Laravel sends, which covers the API and
 * every HTML page (PageController serves the app shell with its SEO tags).
 *
 * The CSP matters most: the login token lives in localStorage, so the one
 * thing standing between an injected script and that token is the browser
 * refusing to run scripts the site did not ship. script-src 'self' does that.
 * The JSON-LD block is a data block, not a script, so it is not affected.
 */
class SecurityHeaders
{
    private const CSP = "default-src 'self'; "
        . "script-src 'self'; "
        // React writes inline style attributes; Google Fonts serves the CSS.
        . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        . "font-src 'self' https://fonts.gstatic.com; "
        // Quiz posters come from Instagram's CDNs, map tiles from OpenStreetMap.
        . "img-src 'self' data: blob: https:; "
        . "connect-src 'self'; "
        . "object-src 'none'; "
        . "base-uri 'self'; "
        . "form-action 'self'; "
        . "frame-ancestors 'none'";

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = $response->headers;
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), payment=(), geolocation=(self)');
        $headers->remove('X-Powered-By');

        if (str_contains((string) $headers->get('Content-Type'), 'text/html')) {
            $headers->set('Content-Security-Policy', self::CSP);
        }

        // Both public environments are HTTPS only (Cloudflare in front).
        // Locally the site is plain http and HSTS would only get in the way.
        if (app()->environment('production', 'staging')) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        return $response;
    }
}

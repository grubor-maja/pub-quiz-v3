<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Quiz;
use Illuminate\Http\Response;

/**
 * Generated rather than a static file, because the quiz list changes daily and
 * a sitemap that lists pages which no longer exist is worse than none at all.
 */
class SitemapController extends Controller
{
    public function index(): Response
    {
        $base = rtrim(config('app.frontend_url', 'https://koznazna.me'), '/');

        $urls = [
            ['loc' => $base . '/', 'changefreq' => 'daily', 'priority' => '1.0'],
            ['loc' => $base . '/organizacije', 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => $base . '/mapa', 'changefreq' => 'daily', 'priority' => '0.8'],
        ];

        foreach (Organization::orderBy('name')->get(['slug', 'updated_at']) as $org) {
            $urls[] = [
                'loc' => $base . '/organizacije/' . $org->slug,
                'lastmod' => $org->updated_at?->toAtomString(),
                'changefreq' => 'weekly',
                'priority' => '0.7',
            ];
        }

        // Past quizzes stay listed: they are still reachable through the archive
        // and they are what gives the site something to be found by out of season.
        $quizzes = Quiz::whereIn('status', ['published', 'cancelled'])
            ->orderByDesc('quiz_date')
            ->limit(2000)
            ->get(['slug', 'quiz_date', 'updated_at']);

        foreach ($quizzes as $quiz) {
            $upcoming = $quiz->quiz_date && $quiz->quiz_date->isFuture();
            $urls[] = [
                'loc' => $base . '/kvizovi/' . $quiz->slug,
                'lastmod' => $quiz->updated_at?->toAtomString(),
                'changefreq' => $upcoming ? 'daily' : 'monthly',
                'priority' => $upcoming ? '0.9' : '0.4',
            ];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $u) {
            $xml .= "  <url>\n    <loc>" . htmlspecialchars($u['loc'], ENT_XML1) . "</loc>\n";
            if (!empty($u['lastmod'])) {
                $xml .= "    <lastmod>{$u['lastmod']}</lastmod>\n";
            }
            $xml .= "    <changefreq>{$u['changefreq']}</changefreq>\n"
                . "    <priority>{$u['priority']}</priority>\n  </url>\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    public function robots(): Response
    {
        $base = rtrim(config('app.frontend_url', 'https://koznazna.me'), '/');

        $body = implode("\n", [
            'User-agent: *',
            'Allow: /',
            // Nothing useful to index behind these, and they would spend crawl
            // budget on pages that require a session.
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /profil',
            'Disallow: /forgot-password',
            'Disallow: /reset-password',
            '',
            'Sitemap: ' . $base . '/sitemap.xml',
            '',
        ]);

        return response($body, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}

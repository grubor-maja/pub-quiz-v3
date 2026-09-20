<?php

namespace App\Services;

use App\Support\PageMeta;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * The built SPA is an empty <div id="root"> and about two kilobytes of head.
 * Every route returned that same markup with the same title, so a crawler that
 * does not execute JavaScript saw the home page no matter which quiz it asked
 * for - and the link unfurlers in WhatsApp, Viber and Messenger, which never
 * execute it, showed the home page for every quiz anyone shared.
 *
 * This rewrites the head per request from the database and appends a <noscript>
 * rendering of the content React is about to draw. Nothing is concealed from
 * anyone: the noscript block holds the page's own content, and JavaScript
 * replaces it with the interactive version rather than with something else.
 */
class AppShell
{
    private const SITE_NAME = 'Ko Zna Zna';

    /**
     * Tags the build already wrote into index.html, removed before ours go in.
     * Rewriting each one in place would mean matching attribute order and quote
     * style; dropping them and appending a fresh set cannot leave two titles or
     * a canonical still pointing at the home page from a quiz.
     */
    private const STALE_TAGS = [
        '#<title>.*?</title>#is',
        '#<meta\s+name="description"[^>]*>#i',
        '#<meta\s+name="robots"[^>]*>#i',
        '#<link\s+rel="canonical"[^>]*>#i',
        '#<meta\s+property="og:[^"]*"[^>]*>#i',
        '#<meta\s+name="twitter:[^"]*"[^>]*>#i',
    ];

    public function render(PageMeta $meta): string
    {
        $base = $this->baseUrl();
        $title = $meta->title === self::SITE_NAME
            ? $meta->title
            : $meta->title . ' | ' . self::SITE_NAME;
        $url = $base . $meta->path;
        $image = $meta->image ?: $base . '/images/logo1.png';

        $html = preg_replace(self::STALE_TAGS, '', $this->shell());

        $html = str_replace(
            '</head>',
            $this->head($meta, $title, $url, $image) . '</head>',
            $html
        );

        if ($meta->noscript !== null) {
            $html = str_replace(
                '</body>',
                "<noscript>\n" . $meta->noscript . "\n</noscript>\n</body>",
                $html
            );
        }

        return $html;
    }

    private function head(PageMeta $meta, string $title, string $url, string $image): string
    {
        $tags = [
            '<title>' . e($title) . '</title>',
            $this->meta('name', 'description', $meta->description),
            '<link rel="canonical" href="' . e($url) . '" />',
            $this->meta('name', 'robots', $meta->index ? 'index, follow' : 'noindex, follow'),
            $this->meta('property', 'og:type', 'website'),
            $this->meta('property', 'og:site_name', self::SITE_NAME),
            $this->meta('property', 'og:locale', 'sr_RS'),
            $this->meta('property', 'og:title', $title),
            $this->meta('property', 'og:description', $meta->description),
            $this->meta('property', 'og:url', $url),
            $this->meta('property', 'og:image', $image),
            $this->meta('name', 'twitter:card', 'summary_large_image'),
            $this->meta('name', 'twitter:title', $title),
            $this->meta('name', 'twitter:description', $meta->description),
            $this->meta('name', 'twitter:image', $image),
        ];

        if ($token = config('seo.google_site_verification')) {
            $tags[] = $this->meta('name', 'google-site-verification', $token);
        }

        if ($meta->jsonLd) {
            // JSON_HEX_TAG matters here rather than as caution: a quiz title or
            // an imported Instagram caption containing "</script>" would close
            // the tag early and put the rest of the payload into the document.
            $json = json_encode(
                $meta->jsonLd,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG
            );
            $tags[] = '<script type="application/ld+json">' . $json . '</script>';
        }

        return "\n    " . implode("\n    ", $tags) . "\n  ";
    }

    private function meta(string $attr, string $name, string $content): string
    {
        return '<meta ' . $attr . '="' . e($name) . '" content="' . e($content) . '" />';
    }

    /**
     * The shell is fetched rather than read from disk because it lives in the
     * frontend container. Cached for a long while: it changes only when the
     * frontend is rebuilt, and a deploy restarts this container anyway.
     */
    private function shell(): string
    {
        return Cache::remember('seo:shell', config('seo.shell_ttl'), function () {
            $origin = rtrim((string) config('seo.shell_origin'), '/');

            $response = Http::timeout(3)->get($origin . '/index.html');

            if (!$response->successful()) {
                throw new RuntimeException(
                    "Could not read the SPA shell from {$origin} (HTTP {$response->status()})."
                );
            }

            $body = $response->body();

            // A shell without a closing head is not the document we think it is
            // - most likely the frontend answered with an error page - and the
            // injection below would silently no-op on every page.
            if (!str_contains($body, '</head>')) {
                throw new RuntimeException("The response from {$origin} is not the SPA shell.");
            }

            return $body;
        });
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('app.frontend_url', 'https://koznazna.me'), '/');
    }
}

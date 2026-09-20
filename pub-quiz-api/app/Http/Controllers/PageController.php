<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Quiz;
use App\Services\AppShell;
use App\Support\Format;
use App\Support\PageMeta;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Serves the SPA shell with the head filled in for the route being requested.
 *
 * The frontend keeps its own useSeo hook: it is what updates the tab title and
 * the canonical link as the user navigates within the app, where no request
 * reaches this controller at all. This covers the first load - the only one a
 * crawler or a link preview ever performs.
 */
class PageController extends Controller
{
    /** How many quizzes the noscript listings render before they stop. */
    private const LIST_LIMIT = 40;

    public function __construct(private readonly AppShell $shell)
    {
    }

    public function home(): Response
    {
        return $this->respond('home', function () {
            $quizzes = Quiz::published()
                ->whereDate('quiz_date', '>=', today())
                ->with('organization:id,name,slug')
                ->orderBy('quiz_date')
                ->orderBy('quiz_time')
                ->limit(self::LIST_LIMIT)
                ->get();

            return new PageMeta(
                title: 'Pab kvizovi u Srbiji',
                description: 'Agregator pab kvizova u Srbiji. Svi predstojeci kvizovi na jednom mestu: datum, vreme, lokacija, kotizacija i organizator.',
                path: '/',
                jsonLd: $this->itemListJsonLd(
                    $quizzes->map(fn (Quiz $q) => [
                        'name' => $this->cleanTitle($q->title),
                        'url' => $this->url('/kvizovi/' . $q->slug),
                    ])->all()
                ),
                noscript: $this->quizListNoscript(
                    'Predstojeći pab kvizovi u Srbiji',
                    'Svi predstojeći pab kvizovi na jednom mestu — datum, vreme, lokacija, kotizacija i organizator.',
                    $quizzes
                ),
            );
        });
    }

    public function quiz(string $slug): Response
    {
        $quiz = Quiz::whereIn('status', ['published', 'cancelled'])
            ->where('slug', $slug)
            ->with('organization')
            ->first();

        if (!$quiz) {
            return $this->notFound('/kvizovi/' . $slug);
        }

        return $this->respond('quiz:' . $slug, function () use ($quiz) {
            $title = $this->cleanTitle($quiz->title);
            $datum = Format::datum($quiz->quiz_date);
            $vreme = Format::vreme($quiz->quiz_time);

            $description = collect([
                $title,
                $datum,
                $vreme ? $vreme . 'h' : null,
                $quiz->location,
                $quiz->entry_fee !== null ? 'kotizacija ' . Format::cena($quiz->entry_fee) : null,
            ])->filter()->implode(', ');

            return new PageMeta(
                title: $title . ', ' . $quiz->organization->name,
                description: $description,
                path: '/kvizovi/' . $quiz->slug,
                image: $quiz->cover_image_url,
                jsonLd: $this->eventJsonLd($quiz),
                noscript: $this->quizNoscript($quiz),
            );
        });
    }

    public function organizations(): Response
    {
        return $this->respond('organizations', function () {
            $orgs = Organization::orderBy('name')->get();

            $items = $orgs->map(fn (Organization $o) =>
                '<li><a href="' . e($this->url('/organizacije/' . $o->slug)) . '">'
                . e($o->name) . '</a>'
                . ($o->description ? ' — ' . e($o->description) : '')
                . '</li>'
            )->implode("\n");

            return new PageMeta(
                title: 'Organizacije',
                description: 'Organizatori pab kvizova u Srbiji. Pregledaj njihove kvizove, termine i lokacije.',
                path: '/organizacije',
                jsonLd: $this->itemListJsonLd(
                    $orgs->map(fn (Organization $o) => [
                        'name' => $o->name,
                        'url' => $this->url('/organizacije/' . $o->slug),
                    ])->all()
                ),
                noscript: "<h1>Organizatori pab kvizova u Srbiji</h1>\n<ul>\n{$items}\n</ul>",
            );
        });
    }

    public function organization(string $slug): Response
    {
        $org = Organization::where('slug', $slug)->first();

        if (!$org) {
            return $this->notFound('/organizacije/' . $slug);
        }

        return $this->respond('organization:' . $slug, function () use ($org) {
            $quizzes = $org->publishedQuizzes()
                ->whereDate('quiz_date', '>=', today())
                ->with('organization:id,name,slug')
                ->orderBy('quiz_date')
                ->orderBy('quiz_time')
                ->limit(self::LIST_LIMIT)
                ->get();

            $description = $org->description
                ?: 'Pab kvizovi u organizaciji ' . $org->name . '. Termini, lokacije, kotizacija i prijava.';

            $jsonLd = array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                'name' => $org->name,
                'description' => $description,
                'url' => $this->url('/organizacije/' . $org->slug),
                'logo' => $org->logo_url,
                'sameAs' => $org->instagram_handle
                    ? ['https://www.instagram.com/' . ltrim($org->instagram_handle, '@') . '/']
                    : null,
            ], fn ($v) => $v !== null);

            return new PageMeta(
                title: $org->name,
                description: $description,
                path: '/organizacije/' . $org->slug,
                image: $org->logo_url,
                jsonLd: $jsonLd,
                noscript: $this->quizListNoscript(
                    $org->name,
                    $description,
                    $quizzes,
                    'Predstojeći kvizovi'
                ),
            );
        });
    }

    public function map(): Response
    {
        return $this->respond('map', fn () => new PageMeta(
            title: 'Mapa kvizova',
            description: 'Mapa pab kvizova u Srbiji. Pronadji kviz blizu sebe po datumu, organizatoru i udaljenosti.',
            path: '/mapa',
            noscript: '<h1>Mapa pab kvizova u Srbiji</h1>'
                . '<p>Interaktivna mapa svih predstojećih pab kvizova. Za prikaz mape potreban je JavaScript — '
                . '<a href="' . e($this->url('/')) . '">lista kvizova</a> radi i bez njega.</p>',
        ));
    }

    /**
     * Anything the app routes but this controller does not describe: the login
     * and profile screens, and any URL a visitor mistypes. They get the shell
     * so the app still boots and renders its own not-found state, but they are
     * kept out of the index - robots.txt already disallows the auth screens,
     * and a soft 404 rendered by JavaScript is not worth a search result.
     */
    public function fallback(Request $request): SymfonyResponse
    {
        // The API's own 404s must stay JSON. A global fallback route runs after
        // every other route including the api group, so without this an unknown
        // /api path would answer an HTML document to a fetch() expecting JSON.
        // Built by hand rather than with abort(404): this route is in the web
        // group, where the exception handler renders an HTML error page.
        if ($request->is('api/*')) {
            return response()->json(['message' => 'Not Found.'], 404);
        }

        return $this->notFound('/' . ltrim($request->path(), '/'));
    }

    // ---------------------------------------------------------------- helpers

    private function respond(string $cacheKey, callable $build): Response
    {
        $html = Cache::remember(
            'seo:page:' . $cacheKey,
            config('seo.page_ttl'),
            fn () => $this->shell->render($build())
        );

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            'Cache-Control' => 'public, max-age=' . config('seo.page_ttl'),
        ]);
    }

    private function notFound(string $path): Response
    {
        $html = $this->shell->render(new PageMeta(
            title: 'Stranica nije pronađena',
            description: 'Tražena stranica ne postoji.',
            path: $path,
            index: false,
        ));

        // A real 404 status, not the 200 the SPA used to answer with. Google
        // treats a 200 that renders "nije pronađen" as a soft 404 and holds it
        // against the rest of the site.
        return response($html, 404, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    /** Strips the trailing date some imported titles carry, as the UI does. */
    private function cleanTitle(string $title): string
    {
        return trim(preg_replace('/\s+\d{4}-\d{2}-\d{2}$/', '', $title));
    }

    private function url(string $path): string
    {
        return rtrim((string) config('app.frontend_url', 'https://koznazna.me'), '/') . $path;
    }

    /**
     * Event markup, which is what lets a listing show the date and venue in the
     * search result itself rather than a bare blue link. Mirrors
     * buildEventJsonLd in pub-quiz-ui/src/pages/QuizDetailPage.tsx.
     */
    private function eventJsonLd(Quiz $quiz): array
    {
        $start = $quiz->quiz_date
            ? $quiz->quiz_date->format('Y-m-d') . 'T' . (Format::vreme($quiz->quiz_time) ?? '20:00') . ':00+02:00'
            : null;

        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Event',
            'name' => $this->cleanTitle($quiz->title),
            'description' => $quiz->description
                ? mb_substr($quiz->description, 0, 500)
                : 'Pab kviz u organizaciji ' . $quiz->organization->name . '.',
            'startDate' => $start,
            'eventStatus' => $quiz->status === 'cancelled'
                ? 'https://schema.org/EventCancelled'
                : 'https://schema.org/EventScheduled',
            'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
            'url' => $this->url('/kvizovi/' . $quiz->slug),
            'image' => $quiz->cover_image_url ? [$quiz->cover_image_url] : null,
            'location' => array_filter([
                '@type' => 'Place',
                'name' => $quiz->location ?: $quiz->organization->name,
                'address' => array_filter([
                    '@type' => 'PostalAddress',
                    'streetAddress' => $quiz->address,
                    'addressCountry' => 'RS',
                ], fn ($v) => $v !== null),
            ], fn ($v) => $v !== null),
            'organizer' => [
                '@type' => 'Organization',
                'name' => $quiz->organization->name,
                'url' => $this->url('/organizacije/' . $quiz->organization->slug),
            ],
            'offers' => $quiz->entry_fee !== null ? [
                '@type' => 'Offer',
                'price' => (string) $quiz->entry_fee,
                'priceCurrency' => 'RSD',
                'availability' => 'https://schema.org/InStock',
                'url' => $this->url('/kvizovi/' . $quiz->slug),
            ] : null,
        ], fn ($v) => $v !== null);
    }

    private function itemListJsonLd(array $items): ?array
    {
        if (!$items) {
            return null;
        }

        return [
            '@context' => 'https://schema.org',
            '@type' => 'ItemList',
            'itemListElement' => array_map(fn (int $i, array $item) => [
                '@type' => 'ListItem',
                'position' => $i + 1,
                'name' => $item['name'],
                'url' => $item['url'],
            ], array_keys($items), $items),
        ];
    }

    /**
     * A listing as plain HTML. Beyond giving the page text to be found by, the
     * links are how a crawler reaches the individual quizzes at all: without
     * JavaScript there is otherwise no path from the home page to any of them,
     * and the sitemap alone is a weaker signal than being linked to.
     */
    private function quizListNoscript(
        string $heading,
        string $intro,
        iterable $quizzes,
        ?string $listHeading = null
    ): string {
        $rows = [];

        foreach ($quizzes as $quiz) {
            $parts = array_filter([
                Format::datum($quiz->quiz_date),
                Format::vreme($quiz->quiz_time) ? Format::vreme($quiz->quiz_time) . 'h' : null,
                $quiz->location,
                $quiz->organization?->name,
                Format::cena($quiz->entry_fee),
            ]);

            $rows[] = '<li><a href="' . e($this->url('/kvizovi/' . $quiz->slug)) . '">'
                . e($this->cleanTitle($quiz->title)) . '</a> — '
                . e(implode(', ', $parts)) . '</li>';
        }

        $html = '<h1>' . e($heading) . "</h1>\n<p>" . e($intro) . "</p>\n";

        if ($rows) {
            if ($listHeading) {
                $html .= '<h2>' . e($listHeading) . "</h2>\n";
            }
            $html .= "<ul>\n" . implode("\n", $rows) . "\n</ul>\n";
        } else {
            $html .= "<p>Trenutno nema najavljenih kvizova.</p>\n";
        }

        $html .= '<p><a href="' . e($this->url('/organizacije')) . '">Organizatori</a> · '
            . '<a href="' . e($this->url('/mapa')) . '">Mapa kvizova</a></p>';

        return $html;
    }

    private function quizNoscript(Quiz $quiz): string
    {
        $rows = array_filter([
            'Datum' => Format::datum($quiz->quiz_date),
            'Vreme' => Format::vreme($quiz->quiz_time),
            'Lokacija' => $quiz->location,
            'Adresa' => $quiz->address,
            'Kotizacija' => Format::cena($quiz->entry_fee),
            'Ekipa' => Format::ekipa($quiz->min_team_members, $quiz->max_team_members),
            'Kontakt' => $quiz->contact_phone,
        ]);

        $html = '<h1>' . e($this->cleanTitle($quiz->title)) . "</h1>\n";

        if ($quiz->status === 'cancelled') {
            $html .= "<p><strong>Ovaj kviz je otkazan.</strong></p>\n";
        }

        $html .= '<p>Pab kviz u organizaciji <a href="'
            . e($this->url('/organizacije/' . $quiz->organization->slug)) . '">'
            . e($quiz->organization->name) . "</a>.</p>\n<ul>\n";

        foreach ($rows as $label => $value) {
            $html .= '<li>' . e($label) . ': ' . e($value) . "</li>\n";
        }

        $html .= "</ul>\n";

        if ($quiz->description) {
            $html .= '<p>' . e($quiz->description) . "</p>\n";
        }

        $html .= '<p><a href="' . e($this->url('/')) . '">Svi pab kvizovi u Srbiji</a></p>';

        return $html;
    }
}

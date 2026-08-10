<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Quiz::published()
            ->with('organization:id,name,slug,logo_url')
            ->orderBy('quiz_date', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('org')) {
            $slugs = array_filter(array_map('trim', explode(',', $request->input('org'))));
            if (count($slugs) > 0) {
                $query->whereHas('organization', fn ($q) => $q->whereIn('slug', $slugs));
            }
        }

        // Subscribed filter - only quizzes from organizations the user follows (requires auth)
        if ($request->boolean('subscribed')) {
            $user = auth('sanctum')->user();
            if ($user) {
                $subscribedIds = $user->subscribedOrganizations()->pluck('organizations.id');
                $query->whereIn('organization_id', $subscribedIds);
            } else {
                $query->whereRaw('1 = 0'); // no results if not authenticated
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('quiz_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('quiz_date', '<=', $request->input('date_to'));
        }

        $paginator = $query->paginate(20);

        $user = auth('sanctum')->user();
        if ($user) {
            $quizIds = collect($paginator->items())->pluck('id')->all();
            $favoritedIds = $user->favorites()->whereIn('quizzes.id', $quizIds)->pluck('quizzes.id')->all();
            $favoritedSet = array_flip($favoritedIds);

            $paginator->getCollection()->transform(function (Quiz $quiz) use ($favoritedSet) {
                $quiz->is_favorited = isset($favoritedSet[$quiz->id]);

                return $quiz;
            });
        } else {
            $paginator->getCollection()->transform(function (Quiz $quiz) {
                $quiz->is_favorited = false;

                return $quiz;
            });
        }

        return response()->json($paginator);
    }

    public function show(string $slug): JsonResponse
    {
        $quiz = Quiz::published()
            ->with('organization:id,name,slug,logo_url,instagram_handle,description')
            ->where('slug', $slug)
            ->firstOrFail();

        $user = auth('sanctum')->user();
        $quiz->is_favorited = $user
            ? $user->favorites()->where('quizzes.id', $quiz->id)->exists()
            : false;

        return response()->json($quiz);
    }

    public function map(): JsonResponse
    {
        $quizzes = Quiz::published()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->where('quiz_date', '>=', now()->subDay())
            ->with('organization:id,name,slug,logo_url')
            ->orderBy('quiz_date', 'asc')
            ->get(['id', 'title', 'slug', 'quiz_date', 'quiz_time', 'location', 'address', 'entry_fee', 'latitude', 'longitude', 'cover_image_url', 'organization_id']);

        return response()->json(['data' => $quizzes]);
    }

    public function calendar(string $slug)
    {
        $quiz = Quiz::published()->with('organization:id,name,slug')->where('slug', $slug)->firstOrFail();

        // Build datetime in Europe/Belgrade tz. Fall back to 19:00 if no time.
        $tz = 'Europe/Belgrade';
        $date = $quiz->quiz_date instanceof \DateTimeInterface
            ? $quiz->quiz_date->format('Y-m-d')
            : (string) $quiz->quiz_date;
        $time = $quiz->quiz_time instanceof \DateTimeInterface
            ? $quiz->quiz_time->format('H:i:s')
            : ((string) $quiz->quiz_time ?: '19:00:00');

        $start = new \DateTime("{$date} {$time}", new \DateTimeZone($tz));
        $end = (clone $start)->modify('+2 hours');

        $fmt = fn (\DateTime $dt) => $dt->format('Ymd\THis');
        $now = (new \DateTime('now', new \DateTimeZone('UTC')))->format('Ymd\THis\Z');

        // Escape per RFC 5545: backslash, comma, semicolon, newline
        $esc = function (?string $s): string {
            if ($s === null) return '';
            return str_replace(
                ["\\", "\r\n", "\n", ",", ";"],
                ["\\\\", "\\n", "\\n", "\\,", "\\;"],
                $s
            );
        };

        $location = trim(implode(', ', array_filter([$quiz->location, $quiz->address])));
        $frontendUrl = rtrim(config('app.frontend_url', config('app.url')), '/');
        $eventUrl = "{$frontendUrl}/kvizovi/{$quiz->slug}";

        $descParts = [];
        if ($quiz->organization) $descParts[] = "Organizator: {$quiz->organization->name}";
        if ($quiz->entry_fee !== null) $descParts[] = "Kotizacija: {$quiz->entry_fee} din po timu";
        $descParts[] = "Timovi: {$quiz->min_team_members}-{$quiz->max_team_members} clanova";
        if ($quiz->contact_phone) $descParts[] = "Kontakt: {$quiz->contact_phone}";
        $descParts[] = "Detalji: {$eventUrl}";
        $description = implode("\n", $descParts);

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//KoZnaZna//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            "UID:{$quiz->id}@koznazna.me",
            "DTSTAMP:{$now}",
            "DTSTART;TZID={$tz}:" . $fmt($start),
            "DTEND;TZID={$tz}:" . $fmt($end),
            'SUMMARY:' . $esc($quiz->title),
            'DESCRIPTION:' . $esc($description),
            'LOCATION:' . $esc($location),
            "URL:{$eventUrl}",
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        $content = implode("\r\n", $lines) . "\r\n";
        $filename = preg_replace('/[^A-Za-z0-9_.-]/', '_', $quiz->slug) . '.ics';

        return response($content, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8; method=PUBLISH',
            // inline (not attachment) - lets mobile OS hand off to Calendar app
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }
}

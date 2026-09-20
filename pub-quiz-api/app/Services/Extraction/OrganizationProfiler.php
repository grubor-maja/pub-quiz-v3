<?php

namespace App\Services\Extraction;

use App\Services\ApifyService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Reads an Instagram account and proposes what an organization record should
 * look like, so adding one is a handle and a confirmation rather than eleven
 * fields typed by hand.
 *
 * It only ever proposes. The default_* values it guesses are applied to every
 * future quiz of that organization, so a wrong venue or price would quietly
 * corrupt everything scraped afterwards. A human confirms before anything is
 * written.
 */
class OrganizationProfiler
{
    /** Enough posts to see what repeats, few enough to stay about a cent. */
    private const SAMPLE_POSTS = 5;

    public function __construct(private ApifyService $apify)
    {
    }

    /**
     * @return array{draft: array<string, mixed>, captions: array<int, string>, warnings: array<int, string>}
     */
    public function profile(string $handle): array
    {
        $handle = ltrim(trim($handle), '@');
        $posts = $this->apify->fetchPostsForHandle($handle, self::SAMPLE_POSTS);

        if ($posts === []) {
            throw new \RuntimeException(
                "Nijedna objava nije povucena za @{$handle}. Proveri da li je nalog javan i da li je naziv tacan."
            );
        }

        $captions = array_values(array_filter(array_map(
            fn ($p) => trim((string) ($p['caption'] ?? '')),
            $posts
        )));

        $draft = [
            'name' => $this->displayName($posts, $handle),
            'instagram_handle' => $handle,
            'logo_url' => $this->firstNonEmpty($posts, ['ownerProfilePicUrl', 'profilePicUrl', 'owner.profilePicUrl']),
        ];

        $warnings = [];
        if (!$draft['logo_url']) {
            $warnings[] = 'Profilna slika nije dostupna kroz scraper, dodaj logo rucno.';
        }

        $inferred = $captions === [] ? [] : $this->inferDefaults($captions, $handle);

        if ($captions !== [] && $inferred === []) {
            $warnings[] = 'AI nije uspeo da procita podrazumevane vrednosti, popuni ih rucno.';
        }

        return [
            'draft' => array_merge($draft, $inferred),
            // Returned so the form can show what the guesses were based on.
            'captions' => array_map(fn ($c) => mb_substr($c, 0, 300), array_slice($captions, 0, 3)),
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $posts
     */
    private function displayName(array $posts, string $handle): string
    {
        $name = $this->firstNonEmpty($posts, ['ownerFullName', 'owner.fullName', 'owner.full_name']);

        return $name !== null ? (string) $name : $handle;
    }

    /**
     * @param  array<int, array<string, mixed>>  $posts
     * @param  array<int, string>  $keys
     */
    private function firstNonEmpty(array $posts, array $keys): ?string
    {
        foreach ($posts as $post) {
            foreach ($keys as $key) {
                $value = data_get($post, $key);
                if (is_string($value) && trim($value) !== '') {
                    return $value;
                }
            }
        }

        return null;
    }

    /**
     * Asks only for values that hold across posts. Anything that varies from
     * quiz to quiz must stay null, because a default is applied whenever a
     * caption does not state the value itself.
     *
     * @param  array<int, string>  $captions
     * @return array<string, mixed>
     */
    private function inferDefaults(array $captions, string $handle): array
    {
        if (!config('services.gemini.enabled') || !config('services.gemini.api_key')) {
            return [];
        }

        $sample = implode("\n\n--- SLEDECA OBJAVA ---\n\n", array_map(
            fn ($c) => mb_substr($c, 0, 1200),
            array_slice($captions, 0, self::SAMPLE_POSTS)
        ));

        $prompt = <<<PROMPT
Ovo su poslednje objave Instagram naloga @{$handle}, organizatora pab kvizova.
Vrati SAMO validan JSON sa ovim poljima:

{
  "description": "jedna recenica o organizaciji na srpskom, bez emodzija",
  "default_location": null,
  "default_address": null,
  "default_quiz_time": null,
  "default_entry_fee": null,
  "default_contact_phone": null,
  "default_min_team_members": null,
  "default_max_team_members": null
}

VAZNO: popuni polje SAMO ako se ista vrednost ponavlja kroz objave i ocigledno
vazi za sve njihove kvizove. Ako se menja od kviza do kviza, ostavi null.

- default_location: naziv lokala, samo ako uvek igraju na istom mestu
- default_address: ulica i broj tog mesta
- default_quiz_time: HH:MM, samo ako je vreme uvek isto
- default_entry_fee: kotizacija u dinarima, kao broj
- default_contact_phone: broj telefona za prijave
- default_min_team_members / default_max_team_members: broj igraca u ekipi.
  NE POGADJAJ. Ako pise samo minimum, popuni samo min i ostavi max kao null.

Objave:
{$sample}
PROMPT;

        try {
            $model = config('services.gemini.model');
            $key = config('services.gemini.api_key');

            $response = Http::timeout(60)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}",
                [
                    'contents' => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'maxOutputTokens' => 800,
                        'responseMimeType' => 'application/json',
                    ],
                ]
            );

            if (!$response->successful()) {
                Log::warning('Organization profiling failed', [
                    'handle' => $handle,
                    'status' => $response->status(),
                ]);

                return [];
            }

            $data = json_decode((string) $response->json('candidates.0.content.parts.0.text'), true);

            if (!is_array($data)) {
                return [];
            }

            // Only keys we asked for, and empty strings normalised to null so
            // they are not stored as "" where the pipeline expects nothing.
            $allowed = [
                'description', 'default_location', 'default_address', 'default_quiz_time',
                'default_entry_fee', 'default_contact_phone',
                'default_min_team_members', 'default_max_team_members',
            ];

            $clean = [];
            foreach ($allowed as $field) {
                $value = $data[$field] ?? null;
                $clean[$field] = ($value === '' || $value === []) ? null : $value;
            }

            if (is_string($clean['default_quiz_time'])) {
                $clean['default_quiz_time'] = substr($clean['default_quiz_time'], 0, 5);
            }

            return $clean;
        } catch (\Throwable $e) {
            Log::warning('Organization profiling threw', ['handle' => $handle, 'error' => $e->getMessage()]);

            return [];
        }
    }
}

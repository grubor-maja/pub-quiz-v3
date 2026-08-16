<?php

namespace App\Services\Extraction;

use App\Models\Organization;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Generic extraction pipeline shared by every organization.
 *
 * Per-organization behaviour is added by subclassing and overriding the two
 * hooks below - never by editing this class:
 *   - promptRules()  extra instructions appended to the shared Gemini prompt
 *   - postProcess()  adjust candidates after extraction, before validation
 *
 * Register the subclass in QuizExtractionService::EXTRACTORS.
 */
class DefaultExtractor implements ExtractorInterface
{
    /** Quiz dates this far before the post date are treated as noise. */
    protected const MAX_DAYS_BEFORE_POST = 7;

    /** Quiz dates further out than this from the post date are treated as noise. */
    protected const MAX_DAYS_AFTER_POST = 180;

    /** Attempts per Gemini call, to ride out free-tier rate limiting. */
    private const MAX_ATTEMPTS = 3;

    private const RATE_LIMIT_BACKOFF_SECONDS = 20;

    public function extract(
        Organization $org,
        string $caption,
        string $postDate,
        ?string $imageUrl = null
    ): array {
        $candidates = $this->runGemini($org, $caption, $postDate, $imageUrl);

        // Gemini unavailable or errored - fall back to the regex reader, which
        // only ever yields a single candidate.
        if ($candidates === null) {
            $candidates = $this->extractWithRegex($caption, $postDate);

            // Nothing from either route. If the AI was supposed to answer and
            // could not, that is a transient failure, not a verdict of
            // "this post is not a quiz" - say so, so the caller can retry later.
            if ($candidates === [] && $this->geminiConfigured()) {
                throw new ExtractionUnavailableException(
                    "Extraction unavailable for {$org->slug}: AI call failed and no fallback match"
                );
            }
        }

        $candidates = $this->postProcess($candidates, $org, $caption, $postDate);
        $candidates = $this->applyDefaults($candidates, $org);

        return $this->validate($candidates, $org, $postDate);
    }

    // ---------------------------------------------------------------- hooks

    /**
     * Organization-specific prompt instructions. Empty for the generic case.
     */
    protected function promptRules(Organization $org): string
    {
        return '';
    }

    /**
     * Organization-specific fixups applied to raw candidates.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array<int, array<string, mixed>>
     */
    protected function postProcess(
        array $candidates,
        Organization $org,
        string $caption,
        string $postDate
    ): array {
        return $candidates;
    }

    // ------------------------------------------------------------- pipeline

    /**
     * @return array<int, array<string, mixed>>|null  null when Gemini could not be used
     */
    private function runGemini(
        Organization $org,
        string $caption,
        string $postDate,
        ?string $imageUrl
    ): ?array {
        if (!$this->geminiConfigured()) {
            return null;
        }

        $prompt = $this->buildPrompt($org, $caption, $postDate);

        // Vision pass first - many organizations put the quiz name only on the image.
        if ($imageUrl) {
            $raw = $this->callGemini($prompt, $imageUrl);
            if ($raw !== null) {
                $candidates = $this->normalize($raw);

                // An eye-catching but unrelated image (a meme, a throwback photo)
                // can talk the model out of a schedule that is plainly in the
                // caption. The caption is authoritative, so confirm an empty
                // vision result with a caption-only pass before giving up.
                if ($candidates !== []) {
                    return $candidates;
                }

                $textRaw = $this->callGemini($prompt, null);
                if ($textRaw === null) {
                    // Confirmation pass failed, so "no quizzes" is unverified.
                    // Report unavailable rather than silently skipping the post.
                    return null;
                }

                $textCandidates = $this->normalize($textRaw);
                if ($textCandidates !== []) {
                    Log::info('Extraction: image pass found nothing, caption pass did', [
                        'org' => $org->slug,
                        'found' => count($textCandidates),
                    ]);
                }

                return $textCandidates;
            }
        }

        $raw = $this->callGemini($prompt, null);

        return $raw === null ? null : $this->normalize($raw);
    }

    protected function buildPrompt(Organization $org, string $caption, string $postDate): string
    {
        $extra = trim($this->promptRules($org));
        $extraBlock = $extra === '' ? '' : "\n\nPRAVILA SPECIFICNA ZA OVU ORGANIZACIJU ({$org->name}):\n{$extra}";

        return <<<PROMPT
Analiziraj Instagram objavu pub kviz organizacije na srpskom.
Vrati SAMO validan JSON, bez objasnjenja, u ovom obliku:

{"is_quiz_post": true|false, "quizzes": [ {...}, {...} ]}

KORAK 1 - DA LI JE OVO NAJAVA KVIZA?
Postavi "is_quiz_post": false i vrati prazan niz "quizzes" ako je objava:
- zanimljivost / fun fact / "na danasnji dan" / vest o poznatoj licnosti
- opsta promocija bez ijednog konkretnog datuma
- najava "uskoro" bez datuma
Objava JESTE najava kviza samo ako sadrzi bar jedan KONKRETAN datum odrzavanja.

VAZNO: merodavan je TEKST OPISA, ne slika. Slika je cesto mem ili zanimljivost
koja sluzi samo da privuce paznju. Ako opis sadrzi datume kvizova, objava JESTE
najava kviza bez obzira na to sto slika prikazuje nesto sasvim drugo.
Slika se koristi samo kao pomoc pri odredjivanju naslova.

KORAK 2 - KOLIKO KVIZOVA IMA U OBJAVI?
- Ako objava sadrzi RASPORED (vise linija oblika "10.08. Naziv kviza", "11.08. Drugi naziv"),
  napravi ZASEBAN objekat u nizu "quizzes" za SVAKU liniju.
- Ako objava najavljuje jedan termin, niz ima tacno jedan objekat.
- Godina se cesto ne pise. Zakljuci je iz datuma objave: {$postDate}.
  Ako bi datum ispao u proslosti vise od nedelju dana, koristi sledecu godinu.

KORAK 3 - POLJA ZA SVAKI KVIZ
- title: naziv/tema tog konkretnog kviza
- quiz_date: YYYY-MM-DD
- quiz_time: HH:MM (null ako ne pise)
- location: ime kafane/kluba (npr. "@nosatipub" -> "Nos a ti pub")
- address: ulica i broj (npr. "Nusiceva 8")
- entry_fee: cena u dinarima kao broj
- min_team_members, max_team_members: opseg broja igraca u ekipi
- contact_phone: broj telefona

PRAVILA ZA NASLOV (title):
1. Ako na slici postoji veliki tekst sa nazivom kviza (npr. "BINGO", "OPSTI KVIZ", "50/50"), to je PRIORITET.
2. Kod rasporeda, naziv je tekst posle datuma u toj liniji ("12.08. Geeks Who Drink" -> "Geeks Who Drink").
3. Ako opis pominje seriju/film/igru/temu, koristi to:
   "kviz posvecen seriji LJUBAV NAVIKA PANIKA" -> "Ljubav, Navika, Panika"
4. Velika slova u opisu (npr. "OPSTI KVIZ BINGO") su cesto naslov.
5. Hashtag-ovi kao #pabkviz8x8 ukazuju na format kviza (8x8 = "Osam puta osam").
6. NIKADA ne vracaj generic naslove kao "Kviz", "Pub Kviz", "Pab Kviz" - premalo je specificno.
7. Naslov treba da bude izmedju 3 i 60 karaktera.

PRIMERI:
- Slika: "BINGO" + opis: "Bingo vece" -> "Bingo"
- Opis: "kviz posvecen seriji LJUBAV NAVIKA PANIKA" -> "Ljubav, Navika, Panika"
- Slika: "50/50 OPSTE ZNANJE" -> "50/50 - Opste znanje"
- Hashtag #pabkvizmuzicki -> "Muzicki kviz"{$extraBlock}

Datum objave za referencu: {$postDate}

Instagram opis:
{$caption}
PROMPT;
    }

    private function geminiConfigured(): bool
    {
        return (bool) config('services.gemini.enabled') && (bool) config('services.gemini.api_key');
    }

    private function callGemini(string $prompt, ?string $imageUrl): ?array
    {
        $model = config('services.gemini.model');
        $apiKey = config('services.gemini.api_key');

        $parts = [['text' => $prompt]];

        if ($imageUrl) {
            $imageData = $this->fetchImageAsBase64($imageUrl);
            if ($imageData !== null) {
                $parts[] = [
                    'inline_data' => [
                        'mime_type' => $imageData['mime_type'],
                        'data' => $imageData['data'],
                    ],
                ];
            }
        }

        $payload = [
            'contents' => [
                ['parts' => $parts],
            ],
            'generationConfig' => [
                'temperature' => 0.1,
                // Schedule posts can hold 15+ quizzes, so this needs headroom.
                'maxOutputTokens' => 4000,
                'responseMimeType' => 'application/json',
            ],
        ];

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        // The free tier limits requests per minute, and a sync can process dozens
        // of posts back to back, so 429s are expected rather than exceptional.
        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            try {
                $response = Http::timeout(60)->post($url, $payload);

                if ($response->status() === 429 && $attempt < self::MAX_ATTEMPTS) {
                    $wait = self::RATE_LIMIT_BACKOFF_SECONDS * $attempt;
                    Log::info("Gemini rate limited, retrying in {$wait}s", ['attempt' => $attempt]);
                    sleep($wait);
                    continue;
                }

                if (!$response->successful()) {
                    Log::warning('Gemini API failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    return null;
                }

                $content = $response->json('candidates.0.content.parts.0.text');
                if (!$content) {
                    Log::warning('Gemini returned empty content', ['response' => $response->json()]);

                    return null;
                }

                $data = json_decode($content, true);

                return is_array($data) ? $data : null;
            } catch (\Throwable $e) {
                Log::warning('Gemini extraction failed', ['error' => $e->getMessage(), 'attempt' => $attempt]);

                return null;
            }
        }

        return null;
    }

    /**
     * Accept both the multi-quiz envelope and a bare single-quiz object, so an
     * older-style model response never silently drops a quiz.
     *
     * @return array<int, array<string, mixed>>
     */
    private function normalize(array $raw): array
    {
        if (array_key_exists('is_quiz_post', $raw) && $raw['is_quiz_post'] === false) {
            return [];
        }

        if (isset($raw['quizzes']) && is_array($raw['quizzes'])) {
            return array_values(array_filter($raw['quizzes'], 'is_array'));
        }

        // Bare object: treat as a single candidate.
        return array_key_exists('quiz_date', $raw) ? [$raw] : [];
    }

    /**
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array<int, array<string, mixed>>
     */
    private function applyDefaults(array $candidates, Organization $org): array
    {
        return array_map(function (array $c) use ($org) {
            $merged = array_merge([
                'title' => null,
                'quiz_date' => null,
                'quiz_time' => null,
                'location' => null,
                'address' => null,
                'entry_fee' => null,
                'min_team_members' => null,
                'max_team_members' => null,
                'contact_phone' => null,
            ], array_filter($c, fn ($v) => $v !== null && $v !== ''));

            // Organization fallbacks, then the global defaults.
            $merged['location'] ??= $org->default_location;
            $merged['address'] ??= $org->default_address;
            $merged['quiz_time'] ??= $this->formatTime($org->default_quiz_time);
            $merged['entry_fee'] ??= $org->default_entry_fee;
            $merged['contact_phone'] ??= $org->default_contact_phone;
            $merged['min_team_members'] ??= $org->default_min_team_members ?? 1;
            $merged['max_team_members'] ??= $org->default_max_team_members ?? 6;

            return $merged;
        }, $candidates);
    }

    /**
     * Drop candidates without a usable date, dates that fall outside a sane
     * window around the post, and duplicates within the same post.
     *
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array<int, array<string, mixed>>
     */
    private function validate(array $candidates, Organization $org, string $postDate): array
    {
        $posted = strtotime($postDate) ?: time();
        $earliest = strtotime('-' . static::MAX_DAYS_BEFORE_POST . ' days', $posted);
        $latest = strtotime('+' . static::MAX_DAYS_AFTER_POST . ' days', $posted);

        $seen = [];
        $valid = [];

        foreach ($candidates as $c) {
            $date = $c['quiz_date'] ?? null;
            if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                continue;
            }

            $ts = strtotime($date);
            if ($ts === false || $ts < $earliest || $ts > $latest) {
                Log::info('Extraction: quiz date outside sane window, dropped', [
                    'org' => $org->slug,
                    'quiz_date' => $date,
                    'post_date' => $postDate,
                ]);
                continue;
            }

            $key = $date . '|' . mb_strtolower(trim((string) ($c['title'] ?? '')));
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $valid[] = $c;
        }

        return $valid;
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }
        if ($time instanceof \DateTimeInterface) {
            return $time->format('H:i');
        }

        return substr((string) $time, 0, 5);
    }

    private function fetchImageAsBase64(string $url): ?array
    {
        try {
            $response = Http::timeout(15)->get($url);
            if (!$response->successful()) {
                return null;
            }

            $contentType = $response->header('Content-Type') ?: 'image/jpeg';
            $mimeType = str_contains($contentType, 'png') ? 'image/png'
                : (str_contains($contentType, 'webp') ? 'image/webp' : 'image/jpeg');

            return [
                'mime_type' => $mimeType,
                'data' => base64_encode($response->body()),
            ];
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch image for Gemini', ['error' => $e->getMessage(), 'url' => $url]);

            return null;
        }
    }

    // --------------------------------------------------------- regex fallback

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function extractWithRegex(string $caption, string $postDate): array
    {
        $data = [
            'title' => null,
            'quiz_date' => null,
            'quiz_time' => null,
            'location' => null,
            'address' => null,
            'entry_fee' => null,
            'min_team_members' => null,
            'max_team_members' => null,
            'contact_phone' => null,
        ];

        // Datum: D.M.YYYY ili DD.MM.YYYY (sa ili bez tacke na kraju)
        if (preg_match('/(\d{1,2})\.(\d{1,2})\.(\d{2,4})\.?/', $caption, $m)) {
            $year = strlen($m[3]) === 2 ? '20' . $m[3] : $m[3];
            $data['quiz_date'] = sprintf('%s-%02d-%02d', $year, (int) $m[2], (int) $m[1]);
        }

        // Vreme
        if (preg_match('/(?:🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛)[^\d\n]*(\d{1,2})[:\.](\d{2})/u', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        } elseif (preg_match('/\b(?:u|od)\s+(\d{1,2})[:\.](\d{2})h?\b/i', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        } elseif (preg_match('/\b(\d{1,2}):(\d{2})h?\b/', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        } elseif (preg_match('/\b(\d{1,2})h\b/i', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:00', (int) $m[1]);
        }

        // Lokacija/adresa
        if (preg_match('/📍[^\n]*/u', $caption, $locLine)) {
            $line = $locLine[0];
            if (preg_match('/\(([^)]+)\)/', $line, $addr)) {
                $data['address'] = trim($addr[1]);
            }
            if (preg_match('/(?:Mesto|Gde|Lokacija)\s*:\s*(?:@[\w.]+\s+)?([^(@\n]+)/u', $line, $venue)) {
                $name = trim(rtrim(trim($venue[1]), '.'));
                if ($name) {
                    $data['location'] = $name;
                }
            }
        }

        // Cena
        if (preg_match('/(\d+)\s*(?:din|rsd)/i', $caption, $m)) {
            $data['entry_fee'] = (int) $m[1];
        }

        // Telefon
        if (preg_match('/0[67]\d[\s\/\-]?\d{3}[\s\-]?\d{3,4}/', $caption, $m)) {
            $data['contact_phone'] = trim($m[0]);
        }

        // Tim: "od 2 do 6 članova" (min i max), zatim "2-6", zatim samo "do 6"
        if (preg_match('/od\s+(\d+)\s+do\s+(\d+)\s*(?:clana|clanova|igraca|člana|članova)/iu', $caption, $m)) {
            $data['min_team_members'] = (int) $m[1];
            $data['max_team_members'] = (int) $m[2];
        } elseif (preg_match('/(\d+)\s*[-–]\s*(\d+)\s*(?:clana|clanova|igraca|člana|članova)/iu', $caption, $m)) {
            $data['min_team_members'] = (int) $m[1];
            $data['max_team_members'] = (int) $m[2];
        } elseif (preg_match('/do\s+(\d+)\s*(?:clana|clanova|igraca|člana|članova)/iu', $caption, $m)) {
            $data['max_team_members'] = (int) $m[1];
        } elseif (preg_match('/(?:takmičara|takmicara|igrača|igraca)\s+u\s+ekipi\s*:\s*do\s+(\d+)/iu', $caption, $m)) {
            $data['max_team_members'] = (int) $m[1];
        }

        $data['title'] = $this->extractTitle($caption);

        return $data['quiz_date'] === null ? [] : [$data];
    }

    private function extractTitle(string $caption): ?string
    {
        // 1. kvizu "NAZIV" (najsigurnije - eksplicitno naveden u navodnicima)
        if (preg_match('/\bkviz(?:u|a)?\s+"([^"\n]{3,80})"/u', $caption, $m)) {
            return $this->cleanTitle($m[1]);
        }

        // 2. kvizu NAZIV VELIKIM SLOVIMA (do interpunkcije ili "u @lokal")
        // Hvata: "kvizu KLASIČNI NARODJACI u @nosatipub" -> "KLASIČNI NARODJACI"
        //        "kvizu NA SLOVO, NA SLOVO - opšte znanje!" -> "NA SLOVO, NA SLOVO - opšte znanje"
        if (preg_match('/\bkviz(?:u|a)?\s+([A-ZŠČĆŽĐ][A-ZŠČĆŽĐa-zščćžđ0-9 ,\/\-]{2,80}?)(?=\s*[!\.\?\n]|\s+u\s+@|\s+u\s+lokal|\s+u\s+kaf|\s+preko|\s+koji|\s*$)/u', $caption, $m)) {
            $t = $this->cleanTitle($m[1]);
            if ($t && mb_strlen($t) >= 3) {
                return $t;
            }
        }

        // 3. "kviz 50/50" ili slicni ne-alfa nazivi
        if (preg_match('/\bkviz(?:u|a)?\s+(\d+\s*\/\s*\d+)/u', $caption, $m)) {
            return $this->cleanTitle($m[1]);
        }

        // 4. Tip kviza: X (strukturirano polje)
        if (preg_match('/Tip\s+kviza\s*:\s*([^\n\.\r]{3,60})/iu', $caption, $m)) {
            $t = $this->cleanTitle($m[1]);
            if ($t && mb_strlen($t) >= 3) {
                return $t;
            }
        }

        // 5. Poznati tipovi kao fallback
        $knownTypes = [
            '/\bbingo\b/iu' => 'Bingo',
            '/50\s*\/\s*50/iu' => '50/50',
            '/anime/i' => 'Anime kviz',
            '/turbo.?folk/iu' => 'Turbo Folk kviz',
            '/muzičk|muzick/iu' => 'Muzicki kviz',
            '/mozgalic/iu' => 'Mozgalice',
            '/filmsk/iu' => 'Filmski kviz',
            '/sportsk/iu' => 'Sportski kviz',
            '/game of thrones/i' => 'Game of Thrones',
            '/harry potter/i' => 'Harry Potter kviz',
            '/na slovo/iu' => 'Kviz na slovo',
            '/ljubav,?\s*navika,?\s*panik/iu' => 'Ljubav, Navika, Panika',
            '/državni posao|drzavni posao/iu' => 'Drzavni posao',
            '/potraga za blagom/iu' => 'Potraga za blagom',
            '/opšt\w+\s+zna|opst\w+\s+zna/iu' => 'Opste znanje',
            '/geografij/iu' => 'Geografija kviz',
            '/istorij/iu' => 'Istorija kviz',
        ];

        foreach ($knownTypes as $pattern => $title) {
            if (preg_match($pattern, $caption)) {
                return $title;
            }
        }

        // 6. Prva linija ako sadrzi "kviz"
        $firstLine = trim(strtok($caption, "\n"));
        $firstLine = trim(preg_replace('/[\x{1F300}-\x{1FFFF}\x{2600}-\x{27BF}]/u', '', $firstLine));
        if (mb_strlen($firstLine) >= 5 && mb_strlen($firstLine) <= 70 && stripos($firstLine, 'kviz') !== false) {
            return $firstLine;
        }

        return null;
    }

    private function cleanTitle(string $s): string
    {
        $s = preg_replace('/[\x{1F300}-\x{1FFFF}\x{2600}-\x{27BF}]/u', '', $s);
        $s = trim($s);
        $s = trim($s, " .,;!\"'-");
        // Ako je sve u velikim slovima i duze od 4 karaktera - pretvori u Title Case
        if (mb_strlen($s) > 4 && mb_strtoupper($s, 'UTF-8') === $s) {
            $s = mb_convert_case(mb_strtolower($s, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        }

        return $s;
    }
}

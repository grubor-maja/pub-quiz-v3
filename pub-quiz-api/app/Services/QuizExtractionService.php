<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QuizExtractionService
{
    public function extract(string $caption, string $postDate, ?string $imageUrl = null): array
    {
        if (config('services.gemini.enabled') && config('services.gemini.api_key')) {
            // Try vision-enabled extraction first (uses image + caption)
            if ($imageUrl) {
                $result = $this->extractWithGemini($caption, $postDate, $imageUrl);
                if ($result !== null) {
                    return $this->mergeWithDefaults($result);
                }
            }

            // Fall back to caption-only LLM
            $result = $this->extractWithGemini($caption, $postDate, null);
            if ($result !== null) {
                return $this->mergeWithDefaults($result);
            }
        }

        return $this->extractWithRegex($caption, $postDate);
    }

    private function buildPrompt(string $caption, string $postDate): string
    {
        return <<<PROMPT
Izvuci podatke o pub kvizu iz Instagram objave na srpskom.
Vrati SAMO validan JSON, bez objasnjenja.

PRAVILA ZA NASLOV (title):
1. Ako na slici postoji veliki tekst sa nazivom kviza (npr. "BINGO", "OPSTI KVIZ", "50/50", "OPSTE ZNANJE"), to je PRIORITET.
2. Ako opis pominje seriju/film/igru/temu, koristi to: "kviz posvecen seriji LJUBAV NAVIKA PANIKA" -> "Ljubav, Navika, Panika"
3. Ako se pominje "Game of Thrones", "Harry Potter", "Drzavni Posao" itd. -> ime + " kviz"
4. Velika slova u opisu (npr. "OPSTI KVIZ BINGO") su cesto naslov
5. Hashtag-ovi kao #pabkviz8x8 ukazuju na format kviza (8x8 = "Osam puta osam")
6. NIKADA ne vracaj generic naslove kao "Kviz", "Pub Kviz", "Pab Kviz" - to je premalo specificno
7. Naslov treba da bude izmedju 3 i 60 karaktera

PRIMERI:
- Slika: "BINGO" + opis: "Bingo vece" -> "Bingo"
- Opis: "kviz posvecen seriji LJUBAV NAVIKA PANIKA" -> "Ljubav, Navika, Panika"
- Slika: "50/50 OPSTE ZNANJE" -> "50/50 - Opste znanje"
- Opis pominje "Vera, Vera" + "LJNP karte" -> "Ljubav, Navika, Panika"
- Hashtag #pabkvizmuzicki -> "Muzicki kviz"

OSTALA POLJA:
- quiz_date: format YYYY-MM-DD
- quiz_time: format HH:MM
- location: ime kafane/pub-a (npr. "@nosatipub" -> "Nos a ti pub", ili kako pise u opisu)
- address: ulica i broj (npr. "Nusiceva 8")
- entry_fee: cena u dinarima kao broj
- min_team_members, max_team_members: opseg (default 1-6)
- contact_phone: broj telefona

Datum posta za referencu: {$postDate}

Instagram opis:
{$caption}
PROMPT;
    }

    private function extractWithGemini(string $caption, string $postDate, ?string $imageUrl): ?array
    {
        $prompt = $this->buildPrompt($caption, $postDate);
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

        try {
            $response = Http::timeout(45)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                    'contents' => [
                        ['parts' => $parts],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'maxOutputTokens' => 800,
                        'responseMimeType' => 'application/json',
                    ],
                ]);

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
            if (is_array($data)) {
                Log::info('Gemini extraction OK', ['model' => $model, 'has_image' => $imageUrl !== null, 'title' => $data['title'] ?? null]);
                return $data;
            }
            return null;
        } catch (\Throwable $e) {
            Log::warning('Gemini extraction failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchImageAsBase64(string $url): ?array
    {
        try {
            $response = Http::timeout(15)->get($url);
            if (!$response->successful()) return null;

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

    private function mergeWithDefaults(array $data): array
    {
        return array_merge([
            'title' => null,
            'quiz_date' => null,
            'quiz_time' => null,
            'location' => null,
            'address' => null,
            'entry_fee' => null,
            'min_team_members' => 1,
            'max_team_members' => 6,
            'contact_phone' => null,
        ], array_filter($data, fn($v) => $v !== null && $v !== ''));
    }

    private function extractWithRegex(string $caption, string $postDate): array
    {
        $data = [
            'title' => null,
            'quiz_date' => null,
            'quiz_time' => null,
            'location' => null,
            'address' => null,
            'entry_fee' => null,
            'min_team_members' => 1,
            'max_team_members' => 6,
            'contact_phone' => null,
        ];

        // Datum: D.M.YYYY ili DD.MM.YYYY (sa ili bez tacke na kraju)
        if (preg_match('/(\d{1,2})\.(\d{1,2})\.(\d{2,4})\.?/', $caption, $m)) {
            $year = strlen($m[3]) === 2 ? '20' . $m[3] : $m[3];
            $data['quiz_date'] = sprintf('%s-%02d-%02d', $year, (int)$m[2], (int)$m[1]);
        }

        // Vreme
        if (preg_match('/(?:🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛)[^\d\n]*(\d{1,2})[:\.](\d{2})/u', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', (int)$m[1], (int)$m[2]);
        } elseif (preg_match('/\b(?:u|od)\s+(\d{1,2})[:\.](\d{2})h?\b/i', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', (int)$m[1], (int)$m[2]);
        } elseif (preg_match('/\b(\d{1,2}):(\d{2})h?\b/', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', (int)$m[1], (int)$m[2]);
        } elseif (preg_match('/\b(\d{1,2})h\b/i', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:00', (int)$m[1]);
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

        return $data;
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
            if ($t && mb_strlen($t) >= 3) return $t;
        }

        // 3. "kviz 50/50" ili slicni ne-alfa nazivi
        if (preg_match('/\bkviz(?:u|a)?\s+(\d+\s*\/\s*\d+)/u', $caption, $m)) {
            return $this->cleanTitle($m[1]);
        }

        // 4. Tip kviza: X (strukturirano polje)
        if (preg_match('/Tip\s+kviza\s*:\s*([^\n\.\r]{3,60})/iu', $caption, $m)) {
            $t = $this->cleanTitle($m[1]);
            if ($t && mb_strlen($t) >= 3) return $t;
        }

        // 5. Poznati tipovi kao fallback
        $knownTypes = [
            '/\bbingo\b/iu'                     => 'Bingo',
            '/50\s*\/\s*50/iu'                  => '50/50',
            '/anime/i'                          => 'Anime kviz',
            '/turbo.?folk/iu'                   => 'Turbo Folk kviz',
            '/muzičk|muzick/iu'                 => 'Muzicki kviz',
            '/mozgalic/iu'                      => 'Mozgalice',
            '/filmsk/iu'                        => 'Filmski kviz',
            '/sportsk/iu'                       => 'Sportski kviz',
            '/game of thrones/i'                => 'Game of Thrones',
            '/harry potter/i'                   => 'Harry Potter kviz',
            '/na slovo/iu'                      => 'Kviz na slovo',
            '/ljubav,?\s*navika,?\s*panik/iu'   => 'Ljubav, Navika, Panika',
            '/državni posao|drzavni posao/iu'   => 'Drzavni posao',
            '/potraga za blagom/iu'             => 'Potraga za blagom',
            '/opšt\w+\s+zna|opst\w+\s+zna/iu'   => 'Opste znanje',
            '/geografij/iu'                     => 'Geografija kviz',
            '/istorij/iu'                       => 'Istorija kviz',
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

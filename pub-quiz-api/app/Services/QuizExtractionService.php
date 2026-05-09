<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QuizExtractionService
{
    public function extract(string $caption, string $postDate): array
    {
        if (config('services.groq.enabled')) {
            $result = $this->extractWithGroq($caption, $postDate);
            if ($result !== null) {
                return $result;
            }
        }

        return $this->extractWithRegex($caption, $postDate);
    }

    private function extractWithGroq(string $caption, string $postDate): ?array
    {
        $prompt = <<<PROMPT
Izvuci podatke o pub kvizu iz sledeceg Instagram opisa na srpskom jeziku.
Vrati SAMO validan JSON objekat, bez objasnjenja.

Polja koja treba izvuci:
- title: naziv kviza (string ili null)
- quiz_date: datum u formatu YYYY-MM-DD (string ili null)
- quiz_time: vreme u formatu HH:MM (string ili null)
- location: naziv mesta/kafane (string ili null)
- address: ulica i broj (string ili null)
- entry_fee: cena kotizacije u dinarima kao broj (integer ili null)
- min_team_members: minimalan broj clanova tima (integer, default 1)
- max_team_members: maksimalan broj clanova tima (integer, default 6)
- contact_phone: broj telefona za prijave (string ili null)

Datum posta za referencu: {$postDate}

Instagram opis:
{$caption}
PROMPT;

        try {
            $response = Http::withToken(config('services.groq.api_key'))
                ->timeout(30)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => 'llama-3.3-70b-versatile',
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.1,
                    'max_tokens' => 500,
                    'response_format' => ['type' => 'json_object'],
                ]);

            if (!$response->successful()) {
                Log::warning('Groq API failed', ['status' => $response->status()]);
                return null;
            }

            $content = $response->json('choices.0.message.content');
            $data = json_decode($content, true);

            if (!is_array($data)) {
                return null;
            }

            return $data;
        } catch (\Throwable $e) {
            Log::warning('Groq extraction failed', ['error' => $e->getMessage()]);
            return null;
        }
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

        // Datum: DD.MM.YYYY. ili DD.MM.YY.
        if (preg_match('/(\d{1,2})\.(\d{1,2})\.(\d{2,4})\.?/', $caption, $m)) {
            $year = strlen($m[3]) === 2 ? '20' . $m[3] : $m[3];
            $data['quiz_date'] = sprintf('%s-%02d-%02d', $year, $m[2], $m[1]);
        }

        // Vreme: 20h, 20:00h, u 20h
        if (preg_match('/(?:u\s+)?(\d{1,2})[:h](\d{2})?[h]?/i', $caption, $m)) {
            $data['quiz_time'] = sprintf('%02d:%02d', $m[1], $m[2] ?? '00');
        }

        // Cena: 500 din, 500din, 500 rsd
        if (preg_match('/(\d+)\s*(?:din|rsd)/i', $caption, $m)) {
            $data['entry_fee'] = (int) $m[1];
        }

        // Telefon: 06x/xxx-xxx ili 06xxxxxxxx
        if (preg_match('/0[67]\d[\s\/\-]?\d{3}[\s\-]?\d{3,4}/', $caption, $m)) {
            $data['contact_phone'] = trim($m[0]);
        }

        // Tim: 2-6 clanova, do 6 clanova
        if (preg_match('/(\d+)\s*[-–]\s*(\d+)\s*(?:clana|clanova|igraca)/i', $caption, $m)) {
            $data['min_team_members'] = (int) $m[1];
            $data['max_team_members'] = (int) $m[2];
        } elseif (preg_match('/do\s+(\d+)\s*(?:clana|clanova|igraca)/i', $caption, $m)) {
            $data['max_team_members'] = (int) $m[1];
        }

        return $data;
    }
}

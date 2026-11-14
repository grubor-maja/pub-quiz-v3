<?php

namespace App\Console\Commands;

use App\Models\Quiz;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodeQuizzes extends Command
{
    protected $signature = 'geocode:quizzes {--all : Re-geocode even already geocoded quizzes}';
    protected $description = 'Geocode quizzes using Nominatim OSM (fills latitude/longitude, and the city from the coordinates)';

    private const USER_AGENT = 'KoZnaGde/1.0 (koznagde.rs)';
    // Latin script: plain "sr" makes Nominatim answer in Cyrillic.
    private const LANGUAGE = 'sr-Latn,sr,en';

    public function handle(): int
    {
        $this->geocodeMissing();
        $this->fillMissingCities();

        return 0;
    }

    private function geocodeMissing(): void
    {
        $query = Quiz::query();
        if (!$this->option('all')) {
            $query->whereNull('latitude');
        }
        $quizzes = $query->whereNotNull('location')->orWhereNotNull('address')->get();

        if ($quizzes->isEmpty()) {
            $this->info('No quizzes to geocode.');
            return;
        }

        // Group by unique location string to save API calls (same pub repeats)
        $grouped = $quizzes->groupBy(function (Quiz $q) {
            return trim(implode(', ', array_filter([$q->location, $q->address])));
        });

        $this->info("Geocoding " . $grouped->count() . " unique addresses across " . $quizzes->count() . " quizzes");
        $updatedTotal = 0;

        foreach ($grouped as $address => $group) {
            if (!$address) continue;

            $first = $group->first();
            $justAddress = trim((string) $first->address);
            $justCity = $this->extractCity($justAddress);

            // Try queries in order of specificity, fall back to broader
            $queries = array_filter([
                $address . ', Srbija',           // Full: "Pub Name, Street 1, Srbija"
                $justAddress ? $justAddress . ', Srbija' : null,   // Just street
                $justCity ? $justCity . ', Srbija' : null,          // Just city
            ]);

            $lat = null;
            $lon = null;
            $city = null;
            $usedQuery = null;

            foreach ($queries as $q) {
                try {
                    $response = Http::withHeaders([
                        'User-Agent' => self::USER_AGENT,
                        'Accept-Language' => self::LANGUAGE,
                    ])
                    ->timeout(15)
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $q,
                        'format' => 'json',
                        'limit' => 1,
                        'addressdetails' => 1,
                    ]);

                    sleep(1); // rate limit before continuing

                    if (!$response->successful()) continue;

                    $data = $response->json();
                    if (!empty($data) && isset($data[0])) {
                        $lat = (float) $data[0]['lat'];
                        $lon = (float) $data[0]['lon'];
                        $city = self::cityFrom($data[0]['address'] ?? []);
                        $usedQuery = $q;
                        break;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Geocoding failed', ['address' => $q, 'error' => $e->getMessage()]);
                    sleep(1);
                }
            }

            if ($lat === null) {
                $this->warn("  {$address}: no results (tried " . count($queries) . " variants)");
                continue;
            }

            foreach ($group as $q) {
                $q->latitude = $lat;
                $q->longitude = $lon;
                $q->city ??= $city;
                $q->geocoded_at = now();
                $q->save();
            }
            $updatedTotal += $group->count();
            $this->info("  {$address} -> \"{$usedQuery}\": {$lat}, {$lon} ({$group->count()} quiz(es))");
        }

        $this->info("Done. Updated {$updatedTotal} quizzes.");
    }

    /**
     * Quizzes placed on the map but with no city yet: everything geocoded
     * before the city column existed, and anything whose search result had no
     * usable address. One reverse lookup per distinct venue position.
     */
    private function fillMissingCities(): void
    {
        $quizzes = Quiz::whereNull('city')->whereNotNull('latitude')->whereNotNull('longitude')->get();
        if ($quizzes->isEmpty()) {
            return;
        }

        $groups = $quizzes->groupBy(fn (Quiz $q) => round((float) $q->latitude, 4) . ',' . round((float) $q->longitude, 4));
        $this->info("Filling the city for {$quizzes->count()} quizzes at {$groups->count()} positions");

        foreach ($groups as $position => $group) {
            [$lat, $lon] = explode(',', $position);
            try {
                $response = Http::withHeaders(['User-Agent' => self::USER_AGENT, 'Accept-Language' => self::LANGUAGE])
                    ->timeout(15)
                    ->get('https://nominatim.openstreetmap.org/reverse', [
                        'lat' => $lat, 'lon' => $lon, 'format' => 'jsonv2', 'zoom' => 10, 'addressdetails' => 1,
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Reverse geocoding failed', ['position' => $position, 'error' => $e->getMessage()]);
                sleep(1);
                continue;
            }
            sleep(1); // Nominatim's usage policy: at most one request a second

            $city = $response->successful() ? self::cityFrom($response->json('address') ?? []) : null;
            if ($city === null) {
                $this->warn("  {$position}: no city");
                continue;
            }

            Quiz::whereIn('id', $group->pluck('id'))->update(['city' => $city]);
            $this->info("  {$position} -> {$city} ({$group->count()} quiz(es))");
        }
    }

    /**
     * The city from a Nominatim address. Serbian data puts it in different
     * places: Belgrade's "city" is the borough ("Gradska opština Stari grad")
     * with the city itself in "county" ("Grad Beograd"), while Novi Sad and
     * Nis appear only as the "municipality" ("Grad Novi Sad").
     *
     * @param  array<string, string>  $a
     */
    public static function cityFrom(array $a): ?string
    {
        $isCity = fn (?string $v) => $v !== null && str_starts_with($v, 'Grad ');

        $candidates = [
            $isCity($a['county'] ?? null) ? $a['county'] : null,
            $isCity($a['municipality'] ?? null) ? $a['municipality'] : null,
            $a['city'] ?? null,
            $a['town'] ?? null,
            $a['village'] ?? null,
            $a['municipality'] ?? null,
        ];

        foreach ($candidates as $c) {
            if ($c) {
                $c = trim(preg_replace('/^(Grad|Gradska opština|Opština)\s+/u', '', $c));
                if ($c !== '' && ! str_starts_with($c, 'opština')) {
                    return mb_substr($c, 0, 80);
                }
            }
        }

        return null;
    }

    /**
     * Try to extract city from address. Serbian addresses typically end with city name,
     * or default to Beograd if not detected.
     */
    private function extractCity(string $address): ?string
    {
        if (!$address) return null;

        // Known cities to detect at the end
        $cities = ['Beograd', 'Novi Sad', 'Niš', 'Nis', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Pančevo', 'Pancevo', 'Čačak', 'Cacak', 'Kraljevo'];
        foreach ($cities as $c) {
            if (stripos($address, $c) !== false) return $c;
        }

        // Default to Belgrade if no explicit city (most quizzes are there)
        return 'Beograd';
    }
}

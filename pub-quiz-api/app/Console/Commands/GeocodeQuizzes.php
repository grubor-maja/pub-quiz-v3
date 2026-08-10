<?php

namespace App\Console\Commands;

use App\Models\Quiz;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodeQuizzes extends Command
{
    protected $signature = 'geocode:quizzes {--all : Re-geocode even already geocoded quizzes}';
    protected $description = 'Geocode quizzes using Nominatim OSM (fills latitude/longitude for future map view)';

    public function handle(): int
    {
        $query = Quiz::query();
        if (!$this->option('all')) {
            $query->whereNull('latitude');
        }
        $quizzes = $query->whereNotNull('location')->orWhereNotNull('address')->get();

        if ($quizzes->isEmpty()) {
            $this->info('No quizzes to geocode.');
            return 0;
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
            $usedQuery = null;

            foreach ($queries as $q) {
                try {
                    $response = Http::withHeaders([
                        'User-Agent' => 'KoZnaZna/1.0 (koznazna.me)',
                        'Accept-Language' => 'sr,en',
                    ])
                    ->timeout(15)
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $q,
                        'format' => 'json',
                        'limit' => 1,
                    ]);

                    sleep(1); // rate limit before continuing

                    if (!$response->successful()) continue;

                    $data = $response->json();
                    if (!empty($data) && isset($data[0])) {
                        $lat = (float) $data[0]['lat'];
                        $lon = (float) $data[0]['lon'];
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
                $q->geocoded_at = now();
                $q->save();
            }
            $updatedTotal += $group->count();
            $this->info("  {$address} -> \"{$usedQuery}\": {$lat}, {$lon} ({$group->count()} quiz(es))");
        }

        $this->info("Done. Updated {$updatedTotal} quizzes.");
        return 0;
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

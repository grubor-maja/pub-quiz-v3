<?php

namespace App\Services\Extraction\Orgs;

use App\Models\Organization;
use App\Services\Extraction\DefaultExtractor;

/**
 * I HATE QUIZ (@pabkviz.rs) posts three distinct kinds of content:
 *
 *  1. Schedule posts - the caption lists one quiz per line ("10.08. Dr House"),
 *     often 10+ dates at once. Each line is its own quiz.
 *  2. Single quiz announcements - one theme, with time / price / address spelled out.
 *  3. Fun facts and throwbacks ("na danasnji dan...") which are NOT quizzes but
 *     do mention years and dates, so the generic prompt alone is not enough.
 *
 * Venue-stable values (address, price, phone, team size) live on the
 * organization row; only the classification rules live here.
 */
class IHateQuizExtractor extends DefaultExtractor
{
    /** Their published schedule never runs further out than a couple of months. */
    protected const MAX_DAYS_AFTER_POST = 90;

    protected function promptRules(Organization $org): string
    {
        return <<<'RULES'
- Ova organizacija cesto objavljuje RASPORED: caption sadrzi listu linija oblika
  "10.08. How I Met Your Mother", "11.08. Dr House", "12.08. Geeks Who Drink".
  SVAKA takva linija je poseban kviz - napravi poseban objekat za svaku.
  Naslov je tekst posle datuma, bez emodzija i bez napomena u zagradi.
- Cesto objavljuju i zanimljivosti ("NA DANASNJI DAN...", vesti o poznatima,
  price o serijama i estradi). Te objave NISU najave kvizova, cak i kad pominju
  godine ili datume iz proslosti - tada vrati "is_quiz_post": false.
- Recenice tipa "USKORO - VRUC VETAR KVIZ" bez konkretnog datuma NISU kviz.
- Otkazivanje javljaju tako sto PONOVE originalnu najavu sa ROZE TRAKOM preko
  slike na kojoj pise "OTKAZANO". Ako vidis takvu traku na slici, postavi
  "is_cancellation": true i zadrzi naslov i datum tog kviza sa slike/teksta.
- Kviz se uvek odrzava u njihovom klubu PUB QUIZ HOUSE, Brace Jugovica 16, Beograd.
  Ne izvlaci neko drugo mesto iz teksta o serijama ili gradovima iz zanimljivosti.
- Termini koje objavljuju: sreda 20:30, subota 21:00, ostali dani 20:30.
RULES;
    }

    /**
     * Their captions state "SREDA 20:30H & SUBOTA 21H". The schedule posts list
     * bare dates with no time, so apply the stated Saturday time where the
     * organization default (20:30) would otherwise be wrong.
     */
    protected function postProcess(
        array $candidates,
        Organization $org,
        string $caption,
        string $postDate
    ): array {
        return array_map(function (array $c) {
            $date = $c['quiz_date'] ?? null;
            if (!is_string($date) || ($c['quiz_time'] ?? null) !== null || ($c['is_cancelled'] ?? false)) {
                return $c;
            }

            $ts = strtotime($date);
            if ($ts !== false && (int) date('N', $ts) === 6) {
                $c['quiz_time'] = '21:00';
            }

            return $c;
        }, $candidates);
    }
}

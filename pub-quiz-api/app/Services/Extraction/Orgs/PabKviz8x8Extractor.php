<?php

namespace App\Services\Extraction\Orgs;

use App\Models\Organization;
use App\Services\Extraction\DefaultExtractor;

/**
 * Pab Kviz 8x8 moved from one post per quiz to one post per week: a carousel
 * where the first slide is a cover and every slide after it announces a single
 * quiz, with its name, venue, address, date and time set into the picture.
 *
 * The caption repeats some of that, but Instagram caps a caption at 2200
 * characters and a week of quizzes does not fit. Their post ends mid sentence
 * on the third quiz, so anything after it exists only as an image. Reading the
 * slides is the only way to get the rest, and it has the side benefit of giving
 * each quiz its own artwork rather than all of them sharing the cover.
 */
class PabKviz8x8Extractor extends DefaultExtractor
{
    protected function readsCarouselSlides(Organization $org): bool
    {
        return true;
    }

    protected function promptRules(Organization $org): string
    {
        return <<<'RULES'
- Naslovna slika nosi natpis "NEDELJNI PLAN" i raspon datuma ("21-27. SEPTEMBAR").
  Ona NIJE kviz - za nju vrati "is_quiz_post": false.
- Fotografije pobednika, zanimljivosti i objave bez naziva kviza takodje nisu kvizovi.
- Na slici kviza naziv je krupnim slovima na vrhu ("Fudbalski kviz",
  "Mix kviz", "Na slovo, na slovo"). Naziv lokala i adresa su dole levo,
  a dan, datum i vreme dole desno ("Ponedeljak, 21.09." i "Od 19:30h").
- Kotizacija i broj clanova ekipe se ne pisu na slici; uzmi ih iz teksta objave.
RULES;
    }
}

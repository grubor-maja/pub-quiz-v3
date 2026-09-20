<?php

namespace App\Services;

use App\Models\Organization;
use App\Services\Extraction\DefaultExtractor;
use App\Services\Extraction\ExtractorInterface;
use App\Services\Extraction\Orgs\IHateQuizExtractor;
use App\Services\Extraction\Orgs\PabKviz8x8Extractor;

/**
 * Entry point for turning an Instagram post into quiz candidates.
 *
 * Every organization runs the shared pipeline in DefaultExtractor. To give one
 * organization special handling, subclass DefaultExtractor (override
 * promptRules() and/or postProcess()) and map its slug here. Organizations that
 * are not listed keep the generic behaviour, so adding a new one cannot change
 * how the existing ones are parsed.
 */
class QuizExtractionService
{
    /** @var array<string, class-string<ExtractorInterface>> slug => extractor */
    private const EXTRACTORS = [
        'i-hate-quiz' => IHateQuizExtractor::class,
        'pab-kviz-8x8' => PabKviz8x8Extractor::class,
    ];

    public function extractorFor(Organization $org): ExtractorInterface
    {
        $class = self::EXTRACTORS[$org->slug] ?? DefaultExtractor::class;

        return app($class);
    }

    /**
     * @return array<int, array<string, mixed>> zero or more quiz candidates
     */
    public function extract(
        Organization $org,
        string $caption,
        string $postDate,
        ?string $imageUrl = null,
        array $carouselImages = []
    ): array {
        return $this->extractorFor($org)
            ->extract($org, $caption, $postDate, $imageUrl, $carouselImages);
    }
}

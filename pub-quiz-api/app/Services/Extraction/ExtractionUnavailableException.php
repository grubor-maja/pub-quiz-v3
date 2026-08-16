<?php

namespace App\Services\Extraction;

use RuntimeException;

/**
 * Thrown when the AI extractor could not be reached at all (rate limit, outage)
 * and the regex fallback found nothing either.
 *
 * This must stay distinct from "the post is not a quiz announcement": the former
 * has to be retried later, the latter is a final answer. Without the distinction
 * a rate-limited post would be permanently marked as skipped.
 */
class ExtractionUnavailableException extends RuntimeException
{
}

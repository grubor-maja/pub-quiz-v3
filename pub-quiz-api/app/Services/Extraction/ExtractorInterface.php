<?php

namespace App\Services\Extraction;

use App\Models\Organization;

interface ExtractorInterface
{
    /**
     * Turn one Instagram post into zero or more quiz candidates.
     *
     * Zero candidates means "this post is not a quiz announcement" (fun facts,
     * promos, throwbacks) and the caller should mark the import as skipped.
     *
     * Each candidate is an array with the keys:
     *   title, quiz_date (Y-m-d), quiz_time (H:i|null), location, address,
     *   entry_fee, min_team_members, max_team_members, contact_phone
     *
     * @return array<int, array<string, mixed>>
     */
    public function extract(
        Organization $org,
        string $caption,
        string $postDate,
        ?string $imageUrl = null
    ): array;
}

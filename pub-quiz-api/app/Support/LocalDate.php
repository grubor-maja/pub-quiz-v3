<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * "Today" as people in Serbia mean it. The app clock stays in UTC so stored
 * timestamps never mix zones, but whether a quiz is upcoming or past is a
 * calendar question asked in Belgrade: in UTC, yesterday's quiz stayed
 * "upcoming" until 01:00 (02:00 in summer), and the map, which used a
 * different rule, disagreed with the list in that window.
 */
final class LocalDate
{
    public const ZONE = 'Europe/Belgrade';

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::ZONE);
    }

    /** Y-m-d in Belgrade. */
    public static function today(): string
    {
        return self::now()->toDateString();
    }
}

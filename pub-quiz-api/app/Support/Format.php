<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * Serbian formatting for the server-rendered head and noscript block. Mirrors
 * pub-quiz-ui/src/lib/utils.ts, which does the same job for the React tree, so
 * a crawler and a visitor are told the same date in the same words.
 *
 * Written out rather than left to PHP's intl formatter: ext-intl is not in the
 * container, and Carbon's own localisation gives "nedelja" for both Sunday and
 * week, which reads wrong in a date.
 */
class Format
{
    private const DANI = [
        1 => 'ponedeljak', 2 => 'utorak', 3 => 'sreda', 4 => 'četvrtak',
        5 => 'petak', 6 => 'subota', 7 => 'nedelja',
    ];

    private const MESECI = [
        1 => 'januar', 2 => 'februar', 3 => 'mart', 4 => 'april',
        5 => 'maj', 6 => 'jun', 7 => 'jul', 8 => 'avgust',
        9 => 'septembar', 10 => 'oktobar', 11 => 'novembar', 12 => 'decembar',
    ];

    /** "petak, 25. septembar 2026." */
    public static function datum(?CarbonInterface $date): ?string
    {
        if (!$date) {
            return null;
        }

        return self::DANI[$date->dayOfWeekIso] . ', '
            . $date->day . '. ' . self::MESECI[$date->month] . ' ' . $date->year . '.';
    }

    /** Stored as H:i:s, shown as H:i. */
    public static function vreme(?string $time): ?string
    {
        return $time ? substr($time, 0, 5) : null;
    }

    public static function cena(?int $amount): string
    {
        if ($amount === null) {
            return 'Besplatno';
        }

        return number_format($amount, 0, ',', '.') . ' din';
    }

    /**
     * Organizers often state only one side of the team size, or neither.
     * Returns null when nothing is known, so the caller omits the field rather
     * than printing a range nobody announced.
     */
    public static function ekipa(?int $min, ?int $max): ?string
    {
        if ($min && $max) {
            return "{$min}-{$max} " . self::clanWord($max);
        }
        if ($min) {
            return "min. {$min} " . self::clanWord($min);
        }
        if ($max) {
            return "do {$max} " . self::clanWord($max);
        }

        return null;
    }

    /** kviz / kviza / kvizova, by the last digit, with the 11-14 exception. */
    public static function pluralSr(int $n, string $singular, string $paucal, string $plural): string
    {
        $abs = abs($n);
        $mod100 = $abs % 100;
        $mod10 = $abs % 10;

        if ($mod100 >= 11 && $mod100 <= 14) {
            return $plural;
        }
        if ($mod10 === 1) {
            return $singular;
        }
        if ($mod10 >= 2 && $mod10 <= 4) {
            return $paucal;
        }

        return $plural;
    }

    public static function kvizWord(int $n): string
    {
        return self::pluralSr($n, 'kviz', 'kviza', 'kvizova');
    }

    public static function clanWord(int $n): string
    {
        return self::pluralSr($n, 'član', 'člana', 'članova');
    }
}

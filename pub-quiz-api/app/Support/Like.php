<?php

namespace App\Support;

/**
 * Builds LIKE patterns from user input. Without escaping, a search for "%"
 * or "_" is read as a wildcard, so "%" matched every row.
 */
final class Like
{
    /** "%term%", with the term's own %, _ and \ matched literally. */
    public static function contains(string $term): string
    {
        return '%' . addcslashes($term, '\\%_') . '%';
    }
}

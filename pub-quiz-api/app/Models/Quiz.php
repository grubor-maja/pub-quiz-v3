<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quiz extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id', 'title', 'slug', 'description',
        'quiz_date', 'quiz_time', 'location', 'address',
        'entry_fee', 'min_team_members', 'max_team_members',
        'contact_phone', 'cover_image_url', 'instagram_post_url', 'status',
    ];

    protected $casts = [
        'quiz_date' => 'date',
        'entry_fee' => 'integer',
        'min_team_members' => 'integer',
        'max_team_members' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function instagramImport(): HasOne
    {
        return $this->hasOne(InstagramImport::class);
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites', 'quiz_id', 'user_id')
            ->withTimestamps();
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Find a quiz already stored for the same organization and day whose title
     * is the same event worded differently - a schedule post says
     * "House of Dragon" where the dedicated announcement says
     * "House of the Dragon". Matching is deliberately conservative: only exact
     * normalized equality or full containment counts, so two genuinely different
     * quizzes on one evening are still kept apart.
     */
    public static function findSimilar(string $organizationId, string $quizDate, string $title): ?self
    {
        $needle = self::normalizeTitle($title);
        if ($needle === '') {
            return null;
        }

        $sameDay = self::where('organization_id', $organizationId)
            ->whereDate('quiz_date', $quizDate)
            ->get();

        foreach ($sameDay as $quiz) {
            $candidate = self::normalizeTitle($quiz->title);
            if ($candidate === '') {
                continue;
            }

            if ($candidate === $needle) {
                return $quiz;
            }

            $shorter = mb_strlen($candidate) < mb_strlen($needle) ? $candidate : $needle;
            $longer = $shorter === $candidate ? $needle : $candidate;

            if (mb_strlen($shorter) >= 6 && str_contains($longer, $shorter)) {
                return $quiz;
            }
        }

        return null;
    }

    /**
     * Lowercase, strip Serbian diacritics, punctuation and filler words so that
     * cosmetic differences in wording collapse onto the same key.
     */
    public static function normalizeTitle(string $title): string
    {
        $s = mb_strtolower(trim($title), 'UTF-8');

        $s = strtr($s, [
            'š' => 's', 'č' => 'c', 'ć' => 'c', 'ž' => 'z', 'đ' => 'd', 'dj' => 'd',
        ]);

        // Drop emoji and anything that is not a letter, digit or space.
        $s = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $s);

        $filler = ['the', 'kviz', 'kvizu', 'kviza', 'tematski', 'specijal', 'pub', 'vece'];
        $words = array_filter(
            preg_split('/\s+/', $s, -1, PREG_SPLIT_NO_EMPTY) ?: [],
            fn ($w) => !in_array($w, $filler, true)
        );

        return implode(' ', $words);
    }
}

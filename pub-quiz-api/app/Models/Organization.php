<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasUuids;

    public const DRAGON_COLORS = ['lime', 'tirkiz', 'ljubicasta', 'koral', 'led', 'roze', 'zlatna', 'crvena'];
    public const DRAGON_PROPS = ['knjiga', 'lopta', 'lupa', 'sijalica', 'ljutko', 'mikrofon', 'nista'];
    public const DRAGON_SHIRTS = ['teget', 'crna', 'bela', 'plava', 'lime'];

    /** Columns every public payload needs to draw an organization's badge and dragon. */
    public const CARD_COLUMNS = 'id,name,slug,logo_url,dragon_color,dragon_prop,dragon_shirt';

    protected $fillable = [
        'name', 'slug', 'instagram_handle', 'logo_url', 'description',
        'dragon_color', 'dragon_prop', 'dragon_shirt',
        'default_location', 'default_address', 'default_quiz_time',
        'default_entry_fee', 'default_contact_phone',
        'default_min_team_members', 'default_max_team_members',
    ];

    protected $casts = [
        'default_entry_fee' => 'integer',
        'default_min_team_members' => 'integer',
        'default_max_team_members' => 'integer',
    ];

    /** Extraction config - internal only, the frontend never reads these. */
    protected $hidden = [
        'default_location', 'default_address', 'default_quiz_time',
        'default_entry_fee', 'default_contact_phone',
        'default_min_team_members', 'default_max_team_members',
    ];

    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }

    public function publishedQuizzes(): HasMany
    {
        return $this->hasMany(Quiz::class)->where('status', 'published');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }
}

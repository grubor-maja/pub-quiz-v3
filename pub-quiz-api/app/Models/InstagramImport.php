<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstagramImport extends Model
{
    use HasUuids;

    protected $fillable = [
        'instagram_post_id', 'instagram_post_url', 'short_code',
        'caption', 'image_url', 'owner_username', 'location_name',
        'posted_at', 'raw_data', 'extracted_data', 'status', 'error_message',
        'quiz_id', 'organization_id',
    ];

    protected $casts = [
        'raw_data' => 'array',
        'extracted_data' => 'array',
        'posted_at' => 'datetime',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}

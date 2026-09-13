<?php

return [

    'apify' => [
        'token' => env('APIFY_TOKEN'),
        'actor_id' => env('APIFY_ACTOR_ID', 'shu8hvrXbJbY3Eb9W'),
        'dataset_id' => env('APIFY_DATASET_ID'),
        // Apify's free tier is $5/month and a run costs roughly $0.0026 per post
        // fetched, so the daily sync across four organizations has to stay small
        // or it burns the month's credit in a week. Twelve posts is a couple of
        // days of their output, which is all a daily run needs to see.
        // For a one-off backfill use: instagram:sync --limit=60
        'post_limit' => (int) env('APIFY_POST_LIMIT', 12),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'enabled' => env('USE_AI_EXTRACTION', true),
    ],

    'sync_api_key' => env('SYNC_API_KEY'),

];

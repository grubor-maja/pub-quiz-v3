<?php

return [

    'apify' => [
        'token' => env('APIFY_TOKEN'),
        'actor_id' => env('APIFY_ACTOR_ID', 'shu8hvrXbJbY3Eb9W'),
        'dataset_id' => env('APIFY_DATASET_ID'),
        // A monthly schedule can announce 30+ quizzes, each later getting its own
        // post with its own artwork. Fetching only the newest handful of posts
        // means most of those quizzes never find their picture.
        'post_limit' => (int) env('APIFY_POST_LIMIT', 60),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'enabled' => env('USE_AI_EXTRACTION', true),
    ],

    'sync_api_key' => env('SYNC_API_KEY'),

];

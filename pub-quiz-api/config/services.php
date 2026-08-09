<?php

return [

    'apify' => [
        'token' => env('APIFY_TOKEN'),
        'actor_id' => env('APIFY_ACTOR_ID', 'shu8hvrXbJbY3Eb9W'),
        'dataset_id' => env('APIFY_DATASET_ID'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'enabled' => env('USE_AI_EXTRACTION', true),
    ],

    'sync_api_key' => env('SYNC_API_KEY'),

];

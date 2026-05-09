<?php

return [

    'apify' => [
        'token' => env('APIFY_TOKEN'),
        'actor_id' => env('APIFY_ACTOR_ID', 'shu8hvrXbJbY3Eb9W'),
        'dataset_id' => env('APIFY_DATASET_ID'),
    ],

    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'enabled' => env('USE_AI_EXTRACTION', true),
    ],

    'sync_api_key' => env('SYNC_API_KEY'),

];

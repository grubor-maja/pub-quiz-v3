<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Shell origin
    |--------------------------------------------------------------------------
    |
    | Where the built SPA shell is fetched from. The frontend container already
    | serves index.html as a static file, so it is read over the internal Docker
    | network rather than baked into this image. A copy would drift: the shell
    | references hashed asset filenames that change on every frontend build, and
    | a stale one would point at JavaScript that no longer exists.
    |
    */

    'shell_origin' => env('SEO_SHELL_ORIGIN', 'http://frontend'),

    /*
    |--------------------------------------------------------------------------
    | Google Search Console verification token
    |--------------------------------------------------------------------------
    |
    | Injected into the head of every page. Kept here rather than in the static
    | index.html so that verifying ownership is an env change and a container
    | restart, instead of a frontend rebuild and redeploy.
    |
    | The value is the content attribute only, not the whole meta tag. Search
    | Console shows it as:
    |   <meta name="google-site-verification" content="THIS_PART" />
    |
    */

    'google_site_verification' => env('GOOGLE_SITE_VERIFICATION'),

    /*
    |--------------------------------------------------------------------------
    | Cache lifetimes (seconds)
    |--------------------------------------------------------------------------
    |
    | The shell changes only on deploy, so it is held far longer than the pages
    | built from it. Page output is cached briefly because a quiz edited in the
    | admin should show up without waiting out a long TTL.
    |
    */

    'shell_ttl' => (int) env('SEO_SHELL_TTL', 3600),

    'page_ttl' => (int) env('SEO_PAGE_TTL', 300),

];

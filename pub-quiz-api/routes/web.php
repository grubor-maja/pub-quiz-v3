<?php

use App\Http\Controllers\PageController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

// Crawlers look for these at the domain root, not under /api, so nginx proxies
// the two paths here. They are generated rather than static files because the
// quiz list changes every day.
Route::get('/sitemap.xml', [SitemapController::class, 'index']);
Route::get('/robots.txt', [SitemapController::class, 'robots']);

/*
|--------------------------------------------------------------------------
| Pages
|--------------------------------------------------------------------------
|
| The frontend container serves its static assets and hands everything else to
| these routes, which return the same SPA shell with the head written for the
| URL being asked for. React still renders the page; this only decides what a
| client that has not run it yet is told the page is about.
|
| Paths are the Serbian ones the React router already uses. They have to stay
| in step with pub-quiz-ui/src/App.tsx: a route defined there and missing here
| falls through to the catch-all and is served noindex.
|
*/
Route::get('/', [PageController::class, 'home']);
Route::get('/kvizovi/{slug}', [PageController::class, 'quiz']);
Route::get('/organizacije', [PageController::class, 'organizations']);
Route::get('/organizacije/{slug}', [PageController::class, 'organization']);
Route::get('/mapa', [PageController::class, 'map']);

Route::fallback([PageController::class, 'fallback']);

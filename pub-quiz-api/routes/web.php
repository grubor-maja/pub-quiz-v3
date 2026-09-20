<?php

use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

// Crawlers look for these at the domain root, not under /api, so nginx proxies
// the two paths here. They are generated rather than static files because the
// quiz list changes every day.
Route::get('/sitemap.xml', [SitemapController::class, 'index']);
Route::get('/robots.txt', [SitemapController::class, 'robots']);

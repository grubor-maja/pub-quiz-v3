<?php

use App\Http\Controllers\Auth;
use App\Http\Controllers\FavoritesController;
use App\Http\Controllers\InstagramSyncController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\QuizController;
use Illuminate\Support\Facades\Route;

Route::get('/quizzes', [QuizController::class, 'index']);
Route::get('/quizzes/{slug}', [QuizController::class, 'show']);

Route::get('/organizations', [OrganizationController::class, 'index']);
Route::get('/organizations/{slug}', [OrganizationController::class, 'show']);

Route::post('/instagram/sync', [InstagramSyncController::class, 'sync']);

// Auth - rate limited (throttle: max attempts per minute)
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/login', [Auth\AuthController::class, 'login']);
    Route::post('/auth/register', [Auth\AuthController::class, 'register']);
});

// Password reset - stricter (email sending is expensive)
Route::middleware('throttle:3,1')->group(function () {
    Route::post('/auth/forgot-password', [Auth\AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [Auth\AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [Auth\AuthController::class, 'logout']);
    Route::get('/auth/me', [Auth\AuthController::class, 'me']);

    Route::get('/favorites', [FavoritesController::class, 'index']);
    Route::post('/favorites/{slug}', [FavoritesController::class, 'store']);
    Route::delete('/favorites/{slug}', [FavoritesController::class, 'destroy']);
});

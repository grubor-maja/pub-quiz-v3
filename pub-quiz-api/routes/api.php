<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth;
use App\Http\Controllers\FavoritesController;
use App\Http\Controllers\InstagramSyncController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::get('/quizzes', [QuizController::class, 'index']);
Route::get('/quizzes/map', [QuizController::class, 'map']);
Route::get('/quizzes/{slug}', [QuizController::class, 'show']);
Route::get('/quizzes/{slug}/calendar.ics', [QuizController::class, 'calendar']);

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

    Route::get('/subscriptions', [SubscriptionController::class, 'index']);
    Route::post('/organizations/{slug}/subscribe', [SubscriptionController::class, 'store']);
    Route::delete('/organizations/{slug}/subscribe', [SubscriptionController::class, 'destroy']);
});

// Admin. Both middlewares matter: auth:sanctum establishes who is calling,
// admin decides whether they may. Hiding these in the frontend would not, since
// the routes are visible to anyone who reads the JavaScript bundle.
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/quizzes', [Admin\AdminQuizController::class, 'index']);
    Route::post('/quizzes', [Admin\AdminQuizController::class, 'store']);
    Route::get('/quizzes/{id}', [Admin\AdminQuizController::class, 'show']);
    Route::put('/quizzes/{id}', [Admin\AdminQuizController::class, 'update']);
    Route::delete('/quizzes/{id}', [Admin\AdminQuizController::class, 'destroy']);

    Route::get('/organizations', [Admin\AdminOrganizationController::class, 'index']);
    Route::post('/organizations', [Admin\AdminOrganizationController::class, 'store']);
    Route::put('/organizations/{id}', [Admin\AdminOrganizationController::class, 'update']);
    Route::delete('/organizations/{id}', [Admin\AdminOrganizationController::class, 'destroy']);
});

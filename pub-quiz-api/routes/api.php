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

Route::post('/instagram/sync', [InstagramSyncController::class, 'sync'])->middleware('throttle:5,1');

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
// the second decides whether they may. Hiding these in the frontend would not,
// since the routes are visible to anyone who reads the JavaScript bundle.
//
// 'manager' admits site admins and organization admins. The controllers then
// limit an organization admin to their own organizations, record by record.
Route::middleware(['auth:sanctum', 'manager'])->prefix('admin')->group(function () {
    Route::get('/quizzes', [Admin\AdminQuizController::class, 'index']);
    Route::post('/quizzes', [Admin\AdminQuizController::class, 'store']);
    Route::get('/quizzes/{id}', [Admin\AdminQuizController::class, 'show']);
    Route::put('/quizzes/{id}', [Admin\AdminQuizController::class, 'update']);
    Route::delete('/quizzes/{id}', [Admin\AdminQuizController::class, 'destroy']);

    Route::get('/organizations', [Admin\AdminOrganizationController::class, 'index']);
    Route::put('/organizations/{id}', [Admin\AdminOrganizationController::class, 'update']);
});

// Site admin only: creating and deleting organizations, the paid scraper
// previews, user roles and the audit log.
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::post('/organizations/preview', [Admin\AdminOrganizationController::class, 'preview']);
    Route::post('/organizations/test-sync', [Admin\AdminOrganizationController::class, 'testSync']);
    Route::post('/organizations', [Admin\AdminOrganizationController::class, 'store']);
    Route::delete('/organizations/{id}', [Admin\AdminOrganizationController::class, 'destroy']);

    Route::get('/users', [Admin\AdminUserController::class, 'index']);
    Route::put('/users/{id}/organizations', [Admin\AdminUserController::class, 'setOrganizations'])->whereNumber('id');

    Route::get('/audit', [Admin\AdminAuditController::class, 'index']);
    Route::post('/audit/{id}/restore', [Admin\AdminAuditController::class, 'restore'])->whereNumber('id');
});

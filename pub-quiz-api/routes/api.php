<?php

use App\Http\Controllers\InstagramSyncController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\QuizController;
use Illuminate\Support\Facades\Route;

Route::get('/quizzes', [QuizController::class, 'index']);
Route::get('/quizzes/{slug}', [QuizController::class, 'show']);

Route::get('/organizations', [OrganizationController::class, 'index']);
Route::get('/organizations/{slug}', [OrganizationController::class, 'show']);

Route::post('/instagram/sync', [InstagramSyncController::class, 'sync']);

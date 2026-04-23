<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\ConsultantController;
use App\Http\Controllers\Api\ExerciseController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::middleware('patient')->group(function () {

        Route::post('/onboarding', [OnboardingController::class, 'store']);
        Route::get('/dashboard/recommendations', [DashboardController::class, 'getRecommendations']);
        Route::get('/dashboard/remix', [DashboardController::class, 'remix']);

        Route::get('/journal', [JournalController::class, 'index']);
        Route::post('/journal', [JournalController::class, 'store']);
        Route::put('/journal/{id}', [JournalController::class, 'update']);
        Route::delete('/journal/{id}', [JournalController::class, 'destroy']);

        Route::get('/consultants', [ConsultantController::class, 'index']);

        Route::get('/exercises', [ExerciseController::class, 'index']);
        Route::post('/exercises/refresh', [ExerciseController::class, 'refresh']);
    });
});
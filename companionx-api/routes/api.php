<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\JournalController; // Ensure this is imported

Route::middleware('web')->group(function () {
    // Public routes
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Protected routes (Login required)
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/user', function (Request $request) {
            return $request->user();
        });

        // --- PATIENT ONLY ROUTES ---
        Route::middleware('patient')->group(function () {

            // Onboarding & Matching
            Route::post('/onboarding', [OnboardingController::class, 'store']);
            Route::get('/dashboard/recommendations', [DashboardController::class, 'getRecommendations']);
            Route::get('/dashboard/remix', [DashboardController::class, 'remix']);

            // Mood Journal CRUD (Task #2 for today)
            Route::get('/journal', [JournalController::class, 'index']);
            Route::post('/journal', [JournalController::class, 'store']);
            Route::delete('/journal/{id}', [JournalController::class, 'destroy']);
        });
    });
});
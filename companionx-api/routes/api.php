<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Import all Controllers
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\ConsultantController;
use App\Http\Controllers\Api\ExerciseController;

/*
|--------------------------------------------------------------------------
| Public Routes (No Login Required)
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


/*
|--------------------------------------------------------------------------
| Protected Routes (Login Required via Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Common Auth Routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    /*
    |--------------------------------------------------------------------------
    | Patient Only Routes (Mood, Exercises, Booking)
    |--------------------------------------------------------------------------
    */
    Route::middleware('patient')->group(function () {
        
        // Onboarding & AI Matching
        Route::post('/onboarding', [OnboardingController::class, 'store']);
        Route::get('/dashboard/recommendations', [DashboardController::class, 'getRecommendations']);
        Route::get('/dashboard/remix', [DashboardController::class, 'remix']);

        // Mood Journal CRUD
        Route::get('/journal', [JournalController::class, 'index']);
        Route::post('/journal', [JournalController::class, 'store']);
        Route::put('/journal/{id}', [JournalController::class, 'update']);
        Route::delete('/journal/{id}', [JournalController::class, 'destroy']);

        // Consultant Discovery
        Route::get('/consultants', [ConsultantController::class, 'index']);

        // AI Mental Exercises
        Route::get('/exercises', [ExerciseController::class, 'index']);
        Route::post('/exercises/refresh', [ExerciseController::class, 'refresh']);
    });

    /*
    |--------------------------------------------------------------------------
    | Future Consultant/Admin Routes can go here
    |--------------------------------------------------------------------------
    */
});
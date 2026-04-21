<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\DashboardController; // 1. MUST IMPORT THIS

// --- Public routes (No login required) ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


// --- Protected routes (MUST be logged in) ---
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Onboarding
    Route::post('/onboarding', [OnboardingController::class, 'store']);
    
    // Dashboard (Needs to be here to use $request->user())
    Route::get('/dashboard/recommendations', [DashboardController::class, 'getRecommendations']);

});
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingFlowController;
use App\Http\Controllers\Api\ConsultantDashboardController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\ConsultantController;
use App\Http\Controllers\Api\ExerciseController;
use App\Http\Controllers\Api\SubscriptionController;

Route::post("/register", [AuthController::class, "register"]);
Route::post("/login", [AuthController::class, "login"]);

Route::middleware("auth:sanctum")->group(function () {
    Route::post("/logout", [AuthController::class, "logout"]);
    Route::get("/me", [AuthController::class, "me"]);
    Route::get("/user", function (Request $request) {
        return $request->user();
    });
    Route::get("/profile", [App\Http\Controllers\Api\ProfileController::class, "show"]);
    Route::patch("/profile", [App\Http\Controllers\Api\ProfileController::class, "update"]);

    Route::get("/subscription/plans", [SubscriptionController::class, "index"]);
    Route::post("/subscription/checkout", [SubscriptionController::class, "checkout"]);
    Route::post("/subscription/complete", [SubscriptionController::class, "complete"]);
    Route::get("/bookings", [BookingFlowController::class, "myBookings"]);

    Route::middleware("patient")->group(function () {
        Route::post("/onboarding", [OnboardingController::class, "store"]);
        Route::get("/dashboard/summary", [DashboardController::class, "getDashboardSummary"]);
        Route::get("/dashboard/next-appointment", [DashboardController::class, "getNextAppointment"]);
        Route::get("/consultants", [ConsultantController::class, "index"]);
        Route::get("/consultants/{consultantId}", [ConsultantController::class, "show"]);
        Route::get("/consultants/{consultantId}/slots", [
            BookingFlowController::class,
            "slots",
        ]);
        Route::get("/booking/hold", [
            BookingFlowController::class,
            "currentHold",
        ]);
        Route::post("/booking/hold", [BookingFlowController::class, "hold"]);
        Route::delete("/booking/hold/{slotId}", [
            BookingFlowController::class,
            "release",
        ]);
    Route::post("/bookings/checkout", [BookingFlowController::class, "checkout"]);
    Route::post("/bookings/complete", [BookingFlowController::class, "complete"]);
        Route::get("/dashboard/recommendations", [
            DashboardController::class,
            "getRecommendations",
        ]);
        Route::get("/dashboard/exercises", [
            DashboardController::class,
            "getExercises",
        ]);
        Route::patch("/dashboard/exercises/progress", [
            DashboardController::class,
            "updateExerciseProgress",
        ]);
        Route::get("/exercise-plans/{planId}", [
            DashboardController::class,
            "getExercisePlan",
        ]);
        Route::post("/exercise-plans/start", [
            DashboardController::class,
            "startExercisePlan",
        ]);
        Route::get("/dashboard/remix", [DashboardController::class, "remix"]);

        Route::get("/journal", [JournalController::class, "index"]);
        Route::post("/journal", [JournalController::class, "store"]);
        Route::put("/journal/{id}", [JournalController::class, "update"]);
        Route::delete("/journal/{id}", [JournalController::class, "destroy"]);

        Route::get("/exercises", [ExerciseController::class, "index"]);
        Route::post("/exercises/refresh", [
            ExerciseController::class,
            "refresh",
        ]);
    });

    Route::middleware("consultant")->group(function () {
        Route::get("/consultant/dashboard", [
            ConsultantDashboardController::class,
            "show",
        ]);
        Route::patch("/consultant/profile", [
            ConsultantDashboardController::class,
            "updateProfile",
        ]);
        Route::post("/consultant/slots", [
            ConsultantDashboardController::class,
            "storeSlot",
        ]);
        Route::patch("/consultant/slots/{slotId}", [
            ConsultantDashboardController::class,
            "updateSlot",
        ]);
        Route::delete("/consultant/slots/{slotId}", [
            ConsultantDashboardController::class,
            "destroySlot",
        ]);
        Route::post("/consultant/bookings/{bookingId}/approve", [
            ConsultantDashboardController::class,
            "approveBooking",
        ]);
        Route::post("/consultant/bookings/{bookingId}/reject", [
            ConsultantDashboardController::class,
            "rejectBooking",
        ]);

        // Schedule & Templates
        Route::get("/consultant/schedule", [
            ConsultantDashboardController::class,
            "schedule",
        ]);
        Route::post("/consultant/templates", [
            ConsultantDashboardController::class,
            "storeTemplate",
        ]);
        Route::delete("/consultant/templates/{templateId}", [
            ConsultantDashboardController::class,
            "destroyTemplate",
        ]);

        // Bookings list
        Route::get("/consultant/bookings", [
            ConsultantDashboardController::class,
            "bookings",
        ]);

        // Wallet / Earnings
        Route::get("/consultant/wallet", [
            ConsultantDashboardController::class,
            "wallet",
        ]);
    });
});

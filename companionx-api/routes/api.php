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
use App\Http\Controllers\Api\BlogController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\StripeWebhookController;

Route::get("/debug/blog-model", function () {
    try {
        $count = \App\Models\BlogPost::count();
        return ["status" => "ok", "count" => $count];
    } catch (\Exception $e) {
        return [
            "status" => "error",
            "message" => $e->getMessage(),
            "trace" => $e->getTraceAsString(),
        ];
    }
});

Route::get("/debug/test", function () {
    try {
        $posts = \App\Models\BlogPost::where("author_id", 1)->get();
        return [
            "status" => "ok",
            "count" => $posts->count(),
            "sql" => \App\Models\BlogPost::where("author_id", 1)->toSql(),
        ];
    } catch (\Exception $e) {
        return [
            "status" => "error",
            "message" => $e->getMessage(),
            "line" => $e->getLine(),
            "file" => $e->getFile(),
        ];
    }
});

Route::get("/debug/test-auth", function (\Illuminate\Http\Request $request) {
    try {
        $user = $request->user();
        if (!$user) {
            return ["status" => "error", "message" => "Not authenticated"];
        }
        $posts = \App\Models\BlogPost::where("author_id", $user->id)->get();
        return [
            "status" => "ok",
            "user_id" => $user->id,
            "count" => $posts->count(),
            "name" => $user->first_name,
        ];
    } catch (\Exception $e) {
        return [
            "status" => "error",
            "message" => $e->getMessage(),
            "line" => $e->getLine(),
            "file" => $e->getFile(),
        ];
    }
});
Route::post("/register", [AuthController::class, "register"]);
Route::post("/login", [AuthController::class, "login"]);
Route::post("/webhooks/stripe", [StripeWebhookController::class, "handle"]);

Route::middleware("auth:sanctum")->group(function () {
    Route::post("/logout", [AuthController::class, "logout"]);
    Route::get("/me", [AuthController::class, "me"]);
    Route::get("/user", function (Request $request) {
        return $request->user();
    });
    Route::get("/profile", [
        App\Http\Controllers\Api\ProfileController::class,
        "show",
    ]);
    Route::patch("/profile", [
        App\Http\Controllers\Api\ProfileController::class,
        "update",
    ]);
    Route::get("/reviews/consultant/{consultantId}", [
        ReviewController::class,
        "consultantReviews",
    ]);

    Route::get("/subscription/plans", [SubscriptionController::class, "index"]);
    Route::post("/subscription/checkout", [
        SubscriptionController::class,
        "checkout",
    ]);
    Route::post("/subscription/complete", [
        SubscriptionController::class,
        "complete",
    ]);
    Route::get("/bookings", [BookingFlowController::class, "myBookings"]);

    Route::middleware("patient")->group(function () {
        Route::post("/onboarding", [OnboardingController::class, "store"]);
        Route::get("/dashboard/summary", [
            DashboardController::class,
            "getDashboardSummary",
        ]);
        Route::get("/dashboard/next-appointment", [
            DashboardController::class,
            "getNextAppointment",
        ]);
        Route::post("/reviews", [ReviewController::class, "store"]);
        Route::get("/consultants", [ConsultantController::class, "index"]);
        Route::get("/consultants/{consultantId}", [
            ConsultantController::class,
            "show",
        ]);
        Route::get("/consultants/{consultantId}/slots", [
            BookingFlowController::class,
            "slots",
        ]);
        Route::post("/bookings/checkout", [
            BookingFlowController::class,
            "checkout",
        ]);
        Route::post("/bookings/complete", [
            BookingFlowController::class,
            "complete",
        ]);
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
        Route::post("/bookings/{bookingId}/complete-session", [
            BookingFlowController::class,
            "completeSession",
        ]);
        Route::post("/consultant/overrides", [
            ConsultantDashboardController::class,
            "storeOverride",
        ]);
        Route::delete("/consultant/overrides/{overrideId}", [
            ConsultantDashboardController::class,
            "destroyOverride",
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

        // Consultant's Corner - Blog posts
        Route::get("/consultant/blogs/drafts", [
            BlogController::class,
            "drafts",
        ]);
        Route::post("/consultant/blogs", [BlogController::class, "store"]);
        Route::put("/consultant/blogs/{id}", [BlogController::class, "update"]);
        Route::delete("/consultant/blogs/{id}", [
            BlogController::class,
            "destroy",
        ]);
    });

    Route::middleware("admin")->prefix("admin")->group(function () {
        Route::get("/summary", [AdminController::class, "summary"]);
        Route::get("/users", [AdminController::class, "users"]);
        Route::get("/consultants", [AdminController::class, "consultants"]);
        Route::patch("/consultants/{consultantId}/approval", [AdminController::class, "updateConsultantApproval"]);
        Route::get("/bookings", [AdminController::class, "bookings"]);
        Route::get("/safety-alerts", [AdminController::class, "safetyAlerts"]);
        Route::patch("/safety-alerts/{alertId}", [AdminController::class, "updateSafetyAlert"]);
        Route::get("/blogs", [AdminController::class, "blogs"]);
        Route::patch("/blogs/{postId}", [AdminController::class, "updateBlog"]);
        Route::delete("/blogs/{postId}", [AdminController::class, "deleteBlog"]);
    });

    // Blog routes (authenticated users - patients and consultants)
    Route::get("/blogs", [BlogController::class, "index"]);
    Route::get("/blogs/{slug}", [BlogController::class, "show"]);
    Route::post("/blogs/{id}/react", [BlogController::class, "react"]);
    Route::delete("/blogs/{id}/react", [BlogController::class, "unreact"]);
});

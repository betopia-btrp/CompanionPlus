<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Create subscription_plans table
        Schema::create("subscription_plans", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table
                ->enum("type", ["consultant", "patient"])
                ->default("consultant");
            $table->decimal("price", 10, 2)->default(0);
            $table->enum("billing_interval", ["monthly"])->default("monthly");
            $table->json("features")->nullable();
            $table->boolean("is_active")->default(true);
            $table->integer("sort_order")->default(0);
            $table->timestamps();
        });

        // 2. Seed plans
        DB::table("subscription_plans")->insert([
            // --- Consultant Plans ---
            [
                "name" => "Free",
                "type" => "consultant",
                "price" => 0.0,
                "billing_interval" => "monthly",
                "features" => json_encode([
                    "max_available_hours_per_month" => 10,
                    "platform_fee_percentage" => 10.0,
                    "includes_analytics" => false,
                ]),
                "is_active" => true,
                "sort_order" => 0,
                "created_at" => now(),
                "updated_at" => now(),
            ],
            [
                "name" => "Premium",
                "type" => "consultant",
                "price" => 29.99,
                "billing_interval" => "monthly",
                "features" => json_encode([
                    "max_available_hours_per_month" => null,
                    "platform_fee_percentage" => 3.0,
                    "includes_analytics" => true,
                ]),
                "is_active" => true,
                "sort_order" => 1,
                "created_at" => now(),
                "updated_at" => now(),
            ],
            // --- Patient Plans ---
            [
                "name" => "Free",
                "type" => "patient",
                "price" => 0.0,
                "billing_interval" => "monthly",
                "features" => json_encode([
                    "ai_exercise_personalization" => false,
                    "ai_consultant_recommendations" => false,
                    "free_sessions" => 2,
                ]),
                "is_active" => true,
                "sort_order" => 0,
                "created_at" => now(),
                "updated_at" => now(),
            ],
            [
                "name" => "Pro",
                "type" => "patient",
                "price" => 9.99,
                "billing_interval" => "monthly",
                "features" => json_encode([
                    "ai_exercise_personalization" => true,
                    "ai_consultant_recommendations" => true,
                    "free_sessions" => 4,
                ]),
                "is_active" => true,
                "sort_order" => 1,
                "created_at" => now(),
                "updated_at" => now(),
            ],
        ]);

        // 3. Update subscriptions table
        Schema::table("subscriptions", function (Blueprint $table) {
            $table
                ->foreignId("subscription_plan_id")
                ->nullable()
                ->constrained("subscription_plans")
                ->onDelete("set null");
            $table
                ->timestamp("current_period_start")
                ->nullable()
                ->after("current_period_end");
            $table
                ->string("payment_processor")
                ->nullable()
                ->after("cancelled_at");
            $table
                ->string("payment_processor_subscription_id")
                ->nullable()
                ->after("payment_processor");
            $table->dropColumn(["tier", "stripe_subscription_id"]);
        });

        // 4. Update users table
        Schema::table("users", function (Blueprint $table) {
            $table
                ->foreignId("subscription_plan_id")
                ->nullable()
                ->constrained("subscription_plans")
                ->onDelete("set null")
                ->after("role");
            $table
                ->integer("free_sessions_remaining")
                ->default(2)
                ->after("subscription_plan_id");
            $table
                ->boolean("is_pro_patient")
                ->default(false)
                ->after("free_sessions_remaining");
            $table
                ->timestamp("patient_pro_expires_at")
                ->nullable()
                ->after("is_pro_patient");
        });
    }

    public function down(): void
    {
        Schema::table("users", function (Blueprint $table) {
            $table->dropForeign(["subscription_plan_id"]);
            $table->dropColumn([
                "subscription_plan_id",
                "free_sessions_remaining",
                "is_pro_patient",
                "patient_pro_expires_at",
            ]);
        });

        Schema::table("subscriptions", function (Blueprint $table) {
            $table->dropForeign(["subscription_plan_id"]);
            $table->dropColumn([
                "subscription_plan_id",
                "current_period_start",
                "payment_processor",
                "payment_processor_subscription_id",
            ]);
            $table->string("tier")->nullable();
            $table->string("stripe_subscription_id")->nullable();
        });

        Schema::dropIfExists("subscription_plans");
    }
};

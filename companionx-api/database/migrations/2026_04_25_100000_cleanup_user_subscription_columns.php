<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table("subscriptions", function (Blueprint $table) {
            $table
                ->integer("free_sessions_remaining")
                ->default(0)
                ->after("current_period_start");
        });

        Schema::table("users", function (Blueprint $table) {
            $table->dropColumn([
                "free_sessions_remaining",
                "is_pro_patient",
                "patient_pro_expires_at",
            ]);
        });
    }

    public function down(): void
    {
        Schema::table("users", function (Blueprint $table) {
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

        Schema::table("subscriptions", function (Blueprint $table) {
            $table->dropColumn("free_sessions_remaining");
        });
    }
};

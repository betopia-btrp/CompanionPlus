<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('recommendation_id')->constrained('ai_recommendations')->onDelete('cascade');
            $table->jsonb('completed_task_keys')->default('[]');
            $table->jsonb('completed_chapter_keys')->default('[]');
            $table->unsignedTinyInteger('completion_percentage')->default(0);
            $table->string('review_feeling')->nullable();
            $table->text('review_text')->nullable();
            $table->string('earned_badge_code')->nullable();
            $table->string('earned_badge_name')->nullable();
            $table->timestamp('earned_badge_at')->nullable();
            $table->timestamp('review_submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'recommendation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_progress');
    }
};

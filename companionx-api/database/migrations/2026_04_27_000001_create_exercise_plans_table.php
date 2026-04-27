<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('origin');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('estimated_time')->nullable();
            $table->jsonb('content_json');
            $table->timestamps();
        });

        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('exercise_plan_id')->nullable()->after('user_id');
        });

        // Migrate existing quests → plans
        DB::table('exercise_quests')
            ->orderBy('id')
            ->chunk(100, function ($quests) {
                foreach ($quests as $quest) {
                    $content = json_decode($quest->content_json, true) ?? [];
                    $title = data_get($content, 'journey.headline', 'Exercise');

                    $planId = DB::table('exercise_plans')->insertGetId([
                        'user_id' => $quest->user_id,
                        'origin' => $quest->origin,
                        'title' => $title,
                        'description' => data_get($content, 'journey.motivation', ''),
                        'estimated_time' => null,
                        'content_json' => $quest->content_json,
                        'created_at' => $quest->created_at ?? now(),
                        'updated_at' => $quest->updated_at ?? now(),
                    ]);

                    DB::table('exercise_progress')
                        ->where('exercise_quest_id', $quest->id)
                        ->update(['exercise_plan_id' => $planId]);
                }
            });

        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->dropForeign(['exercise_quest_id']);
            $table->dropColumn('exercise_quest_id');
        });

        Schema::dropIfExists('exercise_quests');

        // Set NOT NULL and add FK/unique
        DB::statement('ALTER TABLE exercise_progress ALTER COLUMN exercise_plan_id SET NOT NULL');
        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->foreign('exercise_plan_id')->references('id')->on('exercise_plans')->onDelete('cascade');
            $table->unique(['user_id', 'exercise_plan_id']);
        });

        // Seed shared templates
        $service = app(\App\Services\ExerciseService::class);
        foreach ($service->templates() as $tpl) {
            DB::table('exercise_plans')->insert([
                'user_id' => null,
                'origin' => 'template',
                'title' => $tpl['title'],
                'description' => $tpl['description'],
                'estimated_time' => $tpl['estimated_time'],
                'content_json' => json_encode($tpl['content_json']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_plans');
    }
};

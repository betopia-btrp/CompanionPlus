<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_quests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('origin'); // 'template' | 'ai'
            $table->string('template_id')->nullable();
            $table->jsonb('content_json');
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('exercise_quest_id')->nullable()->after('user_id');
        });

        // Migrate existing progress → quests
        DB::table('exercise_progress')
            ->orderBy('id')
            ->chunk(100, function ($records) {
                foreach ($records as $record) {
                    $rec = DB::table('ai_recommendations')
                        ->where('id', $record->recommendation_id)
                        ->where('rec_type', 'exercise')
                        ->first(['user_id', 'content_json']);

                    if (!$rec) continue;

                    $questId = DB::table('exercise_quests')->insertGetId([
                        'user_id' => $rec->user_id,
                        'origin' => 'ai',
                        'template_id' => null,
                        'content_json' => is_string($rec->content_json)
                            ? $rec->content_json
                            : json_encode($rec->content_json),
                        'status' => $record->completed_at ? 'completed' : 'active',
                        'created_at' => $record->created_at ?? now(),
                        'updated_at' => $record->updated_at ?? now(),
                    ]);

                    DB::table('exercise_progress')
                        ->where('id', $record->id)
                        ->update(['exercise_quest_id' => $questId]);
                }
            });

        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->dropForeign(['recommendation_id']);
        });

        DB::statement('ALTER TABLE exercise_progress DROP CONSTRAINT IF EXISTS exercise_progress_user_id_recommendation_id_unique');

        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->dropColumn('recommendation_id');
        });

        DB::statement('ALTER TABLE exercise_progress ALTER COLUMN exercise_quest_id SET NOT NULL');

        Schema::table('exercise_progress', function (Blueprint $table) {
            $table->foreign('exercise_quest_id')->references('id')->on('exercise_quests')->onDelete('cascade');
            $table->unique(['user_id', 'exercise_quest_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_quests');
    }
};

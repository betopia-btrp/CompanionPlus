<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MoodJournal;
use App\Jobs\AnalyzeJournalSentiment;
use App\Jobs\GenerateMentalExercises; // Added this
use App\Services\ExerciseService;
use Illuminate\Http\Request;
use App\Services\JournalInsightsService;
use App\Services\SentimentAnalysisService;

class JournalController extends Controller
{
    public function index(Request $request, JournalInsightsService $journalInsightsService)
    {
        return response()->json($journalInsightsService->buildPayload($request->user()->id));
    }

    public function store(Request $request, SentimentAnalysisService $sentimentAnalysisService)
    {
        $request->validate([
            'emoji_mood' => 'required|string',
            'text_note' => 'nullable|string',
        ]);

        $userId = $request->user()->id;

        // 1. Create the journal entry
        $journal = MoodJournal::create([
            'user_id' => $userId,
            'emoji_mood' => $request->emoji_mood,
            'text_note' => $request->text_note,
        ]);

        AnalyzeJournalSentiment::dispatch($journal->id);
        GenerateMentalExercises::dispatch($journal->id);

        return response()->json([
            'message' => 'Journal entry saved!',
            'data' => $sentimentAnalysisService->buildEntryPayload($journal),
            'analysis_status' => 'queued',
            'exercise_status' => 'queued',
        ], 201);
    }

    public function destroy(Request $request, $id)
    {
        $journal = MoodJournal::where('user_id', $request->user()->id)->findOrFail($id);
        $journal->delete();

        return response()->json(['message' => 'Entry deleted successfully']);
    }
}

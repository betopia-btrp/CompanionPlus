<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MoodJournal;
use App\Jobs\AnalyzeJournalSentiment;
use App\Jobs\GenerateMentalExercises; // Added this
use App\Services\ExerciseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JournalController extends Controller
{
    /**
     * Display a listing of the user's journal entries.
     */
    public function index(Request $request)
    {
        $journals = MoodJournal::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($journals);
    }

    /**
     * Store a newly created journal entry.
     */
    public function store(Request $request)
    {
        $request->validate([
            'emoji_mood' => 'required|string',
            'text_note' => 'nullable|string'
        ]);

        $userId = $request->user()->id;

        // 1. Create the journal entry
        $journal = MoodJournal::create([
            'user_id' => $userId,
            'emoji_mood' => $request->emoji_mood,
            'text_note' => $request->text_note,
        ]);

        // 2. Trigger AI Sentiment Analysis (Score & Risk detection)
        if (!empty($request->text_note)) {
            AnalyzeJournalSentiment::dispatch($journal);
        }

        // 3. NEW: Trigger 3-Chapter Mental Exercise Generation
        // This takes the current emoji + note to create immediate content for the booking/exercises page
        GenerateMentalExercises::dispatch($journal);

        // 4. ADAPTIVE LOGIC: Comprehensive trend update every 5 entries
        try {
            $totalEntries = MoodJournal::where('user_id', $userId)->count();
            
            if ($totalEntries >= 5 && $totalEntries % 5 === 0) {
                $exerciseService = new ExerciseService();
                $exerciseService->generateAdaptiveExercises($userId);
                Log::info("Long-term adaptive exercises refreshed for User: " . $userId);
            }
        } catch (\Exception $e) {
            Log::error("Failed to trigger adaptive exercises: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Journal saved! AI is generating your personalized exercises.',
            'data' => $journal
        ], 201);
    }

    /**
     * Update an existing journal entry.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'emoji_mood' => 'required|string',
            'text_note' => 'nullable|string'
        ]);

        $journal = MoodJournal::where('user_id', $request->user()->id)->findOrFail($id);

        $journal->update([
            'emoji_mood' => $request->emoji_mood,
            'text_note' => $request->text_note,
        ]);

        // Re-run sentiment and chapter generation if the text changed
        if ($journal->wasChanged('text_note') && !empty($request->text_note)) {
            AnalyzeJournalSentiment::dispatch($journal);
            GenerateMentalExercises::dispatch($journal);
        }

        return response()->json([
            'message' => 'Journal updated and re-analyzed by AI.',
            'data' => $journal
        ]);
    }

    /**
     * Remove the specified entry.
     */
    public function destroy(Request $request, $id)
    {
        $journal = MoodJournal::where('user_id', $request->user()->id)->findOrFail($id);
        $journal->delete();

        return response()->json(['message' => 'Entry deleted successfully']);
    }
}
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MoodJournal;
use Illuminate\Http\Request;

class JournalController extends Controller
{
    // Fetch all journals for the logged-in user
    public function index(Request $request)
    {
        $journals = MoodJournal::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($journals);
    }

    // Save a new entry
    public function store(Request $request)
    {
        $request->validate([
            'emoji_mood' => 'required|string',
            'text_note' => 'nullable|string'
        ]);

        $journal = MoodJournal::create([
            'user_id' => $request->user()->id,
            'emoji_mood' => $request->emoji_mood,
            'text_note' => $request->text_note,
        ]);

        return response()->json([
            'message' => 'Journal entry saved!',
            'data' => $journal
        ], 201);
    }

    // Delete an entry
    public function destroy(Request $request, $id)
    {
        $journal = MoodJournal::where('user_id', $request->user()->id)->findOrFail($id);
        $journal->delete();

        return response()->json(['message' => 'Entry deleted successfully']);
    }
}
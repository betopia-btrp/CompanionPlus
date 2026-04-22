"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar, Plus, Smile, Meh, Frown, AlertCircle } from "lucide-react";

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedMood, setSelectedMood] = useState("😊");

  const moods = ["😊", "😐", "😔", "😰", "😡"];

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await api.get("/journal");
      setEntries(res.data);
    } catch (e) {
      console.error("Error fetching journal");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post("/journal", {
        emoji_mood: selectedMood,
        text_note: newNote,
      });
      setNewNote("");
      setShowModal(false);
      fetchEntries();
    } catch (e) {
      alert("Failed to save journal");
    }
  };

  const deleteEntry = async (id: number) => {
    if (confirm("Are you sure you want to delete this memory?")) {
      await api.delete(`/journal/${id}`);
      fetchEntries();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition">
            <ArrowLeft size={20} /> Back to Hub
          </Link>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
          >
            <Plus size={20} /> Write Today
          </button>
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-8">Mood History</h1>

        {/* Entries List */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading your journey...</div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
             <p className="text-slate-400 text-lg">Your journal is empty. Start writing to track your growth.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry: any) => (
              <div key={entry.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition">
                <div className="flex items-center gap-6">
                  <span className="text-5xl">{entry.emoji_mood}</span>
                  <div>
                    <p className="text-slate-700 font-medium text-lg mb-1">{entry.text_note || "No notes added"}</p>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar size={14} />
                      {new Date(entry.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteEntry(entry.id)} className="p-3 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Write Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">How are you feeling?</h2>
              
              <div className="flex justify-between mb-8">
                {moods.map((m) => (
                  <button 
                    key={m} 
                    onClick={() => setSelectedMood(m)}
                    className={`text-4xl p-3 rounded-2xl transition-all ${selectedMood === m ? 'bg-blue-50 scale-125' : 'grayscale opacity-40 hover:opacity-100'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <textarea 
                className="w-full h-40 p-5 border border-slate-100 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none mb-6 resize-none"
                placeholder="What's on your mind? (Optional)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100">Save Journal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
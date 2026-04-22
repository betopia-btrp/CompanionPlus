"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar, Plus, Edit2 } from "lucide-react";

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // FORM STATE
  const [newNote, setNewNote] = useState("");
  const [selectedMood, setSelectedMood] = useState("😊");
  const [editingId, setEditingId] = useState<number | null>(null);

  const moods = ["😊", "😐", "😔", "😰", "😡"];

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      const res = await api.get("/journal");
      setEntries(res.data);
    } catch (e) { console.error("Error fetching journal"); } 
    finally { setLoading(false); }
  };

  // OPEN MODAL FOR EDITING
  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setNewNote(entry.text_note);
    setSelectedMood(entry.emoji_mood);
    setShowModal(true);
  };

  // HANDLE BOTH SAVE AND UPDATE
  const handleSave = async () => {
    try {
      if (editingId) {
        // UPDATE EXISTING
        await api.put(`/journal/${editingId}`, {
          emoji_mood: selectedMood,
          text_note: newNote,
        });
      } else {
        // CREATE NEW
        await api.post("/journal", {
          emoji_mood: selectedMood,
          text_note: newNote,
        });
      }
      resetForm();
      fetchEntries();
    } catch (e) { alert("Action failed"); }
  };

  const resetForm = () => {
    setNewNote("");
    setSelectedMood("😊");
    setEditingId(null);
    setShowModal(false);
  };

  const deleteEntry = async (id: number) => {
    if (confirm("Delete this memory forever?")) {
      try {
        await api.delete(`/journal/${id}`);
        fetchEntries();
      } catch (e) { alert("Delete failed"); }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition">
            <ArrowLeft size={20} /> Back to Hub
          </Link>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"
          >
            <Plus size={20} /> Write Today
          </button>
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-8">Mood History</h1>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry: any) => (
              <div key={entry.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition">
                <div className="flex items-center gap-6">
                  <span className="text-5xl">{entry.emoji_mood}</span>
                  <div>
                    <p className="text-slate-700 font-medium text-lg mb-1">{entry.text_note || "No notes"}</p>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar size={14} />
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => handleEdit(entry)} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl">
                    <Edit2 size={20} />
                  </button>
                  <button onClick={() => deleteEntry(entry.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal for Add/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">{editingId ? "Edit Entry" : "How are you feeling?"}</h2>
              <div className="flex justify-between mb-8">
                {moods.map((m) => (
                  <button key={m} onClick={() => setSelectedMood(m)} className={`text-4xl p-3 rounded-2xl transition-all ${selectedMood === m ? 'bg-blue-50 scale-125' : 'grayscale opacity-40'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <textarea 
                className="w-full h-40 p-5 border bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={resetForm} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition">
                  {editingId ? "Update Entry" : "Save Journal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
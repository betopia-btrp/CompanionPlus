"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { 
  Search, Lock, Star, Clock, DollarSign, 
  ArrowLeft, Sparkles, Brain, CheckCircle, MessageSquare 
} from "lucide-react";

export default function BookingPage() {
  // We now store the entire object from the backend
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false); // Change to true to see AI matches

  const [filters, setFilters] = useState({
    specialization: "",
    max_rate: 5000,
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/consultants", { params: filters });
      setData(res.data);
    } catch (e) {
      console.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* TOP NAVIGATION & BACK BUTTON */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition font-medium"
          >
            <ArrowLeft size={20} /> Back to Hub
          </Link>
        </div>

        {/* SECTION 1: PERSONAL HEALING LAB (AI CHAPTERS) */}
        {data?.ai_data?.chapters && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-600 p-2 rounded-lg text-white">
                <Brain size={24} />
              </div>
              <h2 className="text-3xl font-black text-slate-900">Personal Healing Lab</h2>
              <Sparkles className="text-purple-500 fill-current" />
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {data.ai_data.chapters.map((chap: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-[2rem] shadow-sm border border-purple-100 hover:shadow-md transition-all">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Chapter {idx + 1}</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2 mb-3">{chap.chapter_title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">{chap.content}</p>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                    <Clock size={14} /> {chap.estimated_time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: AI SMART MATCH (LOCKED UI) */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            AI Consultant Matches
          </h2>
          
          {isSubscriber && data?.ai_data?.recommended_consultants ? (
            <div className="grid md:grid-cols-2 gap-8">
               {data.ai_data.recommended_consultants.map((c: any) => (
                 <ConsultantCard key={c.id} consultant={c} isMatch={true} />
               ))}
            </div>
          ) : (
            <div className="relative bg-white border-2 border-dashed border-blue-200 rounded-[2.5rem] p-12 text-center overflow-hidden">
              <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6">
                <div className="bg-blue-600 p-4 rounded-2xl text-white mb-4 shadow-xl">
                  <Lock size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium Feature</h3>
                <p className="text-slate-500 max-w-md mb-6">
                  Subscribe to see your 2 specifically matched consultants based on your onboarding profile.
                </p>
                <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition">
                  Upgrade to Unlock Matches
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 opacity-10 pointer-events-none">
                  <div className="h-40 bg-slate-200 rounded-3xl"></div>
                  <div className="h-40 bg-slate-200 rounded-3xl"></div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: MARKETPLACE FILTERS */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 pt-8 border-t border-slate-200">
            <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Expert Directory</h2>
                <p className="text-slate-500">Browse and book sessions manually.</p>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <select 
                    className="p-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                >
                    <option value="">All Specializations</option>
                    <option value="Psychologist">Clinical Psychologist</option>
                    <option value="Student">Student Counselor</option>
                    <option value="Career">Career Coach</option>
                </select>

                <div className="flex items-center bg-white border rounded-xl px-3 gap-2">
                    <DollarSign size={16} className="text-slate-400" />
                    <input 
                        type="number" placeholder="Max BDT"
                        className="p-3 w-28 outline-none font-medium"
                        onChange={(e) => setFilters({...filters, max_rate: Number(e.target.value)})}
                    />
                </div>
            </div>
        </div>

        {/* MARKETPLACE GRID */}
        {loading ? (
            <div className="grid md:grid-cols-3 gap-8">
                {[1,2,3].map(i => <div key={i} className="h-80 bg-white border border-slate-100 animate-pulse rounded-[2.5rem]"></div>)}
            </div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data?.consultants?.map((c: any) => (
                    <ConsultantCard key={c.id} consultant={c} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

// Reusable Card Component to keep code clean
function ConsultantCard({ consultant, isMatch = false }: { consultant: any, isMatch?: boolean }) {
  return (
    <div className={`bg-white rounded-[2.5rem] p-8 shadow-sm border ${isMatch ? 'border-blue-200 ring-4 ring-blue-50' : 'border-slate-100'} hover:shadow-2xl transition-all group relative overflow-hidden`}>
        {isMatch && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-2xl text-xs font-black tracking-widest uppercase">
                Best Match
            </div>
        )}

        <div className="flex justify-between items-start mb-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">
                {consultant.user.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
            </div>
            <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Star size={14} className="fill-current" /> {consultant.average_rating || "5.0"}
            </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">
            {consultant.user.first_name} {consultant.user.last_name}
        </h3>
        <p className="text-blue-600 font-semibold text-sm mb-4">{consultant.specialization}</p>
        
        {/* If AI matched, show the reason */}
        {consultant.match_reason && (
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex gap-3">
                <MessageSquare size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-slate-700 text-xs italic leading-relaxed">"{consultant.match_reason}"</p>
            </div>
        )}

        <p className="text-slate-500 text-sm mb-8 line-clamp-2 leading-relaxed">{consultant.bio}</p>

        <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
            <div className="font-black text-xl text-slate-900">৳{consultant.base_rate_bdt} <span className="text-slate-400 text-xs font-normal">/session</span></div>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                Book
            </button>
        </div>
    </div>
  );
}
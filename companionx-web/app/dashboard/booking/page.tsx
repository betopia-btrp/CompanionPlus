"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Search, Filter, Lock, Star, Calendar, Clock, DollarSign } from "lucide-react";

export default function BookingPage() {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false); // Dummy state for now

  // Filters state
  const [filters, setFilters] = useState({
    specialization: "",
    max_rate: 3000,
    gender: "",
  });

  useEffect(() => {
    fetchConsultants();
  }, [filters]);

  const fetchConsultants = async () => {
    setLoading(true);
    try {
      const res = await api.get("/consultants", { params: filters });
      setConsultants(res.data);
    } catch (e) {
      console.error("Error fetching consultants");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* SECTION 1: AI RECOMMENDATIONS (LOCKED) */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            AI Smart Match
          </h2>
          <div className="relative bg-white border-2 border-dashed border-blue-200 rounded-[2.5rem] p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6">
              <div className="bg-blue-600 p-4 rounded-2xl text-white mb-4 shadow-xl">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium Feature</h3>
              <p className="text-slate-500 max-w-md mb-6">
                Subscribe to Student or Premium tier to see consultants specifically matched to your onboarding answers.
              </p>
              <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition">
                Upgrade to Unlock
              </button>
            </div>
            
            {/* Blurry content for visuals */}
            <div className="grid grid-cols-2 gap-4 opacity-20 pointer-events-none">
                <div className="h-32 bg-slate-100 rounded-2xl"></div>
                <div className="h-32 bg-slate-100 rounded-2xl"></div>
            </div>
          </div>
        </div>

        {/* SECTION 2: SEARCH MARKETPLACE */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
            <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Find a Consultant</h2>
                <p className="text-slate-500">Search manually through our network of experts.</p>
            </div>
            
            {/* SEARCH BAR & FILTERS */}
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <select 
                    className="p-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                        type="number" placeholder="Max Price"
                        className="p-3 w-28 outline-none"
                        onChange={(e) => setFilters({...filters, max_rate: Number(e.target.value)})}
                    />
                </div>
            </div>
        </div>

        {/* RESULTS GRID */}
        {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-3xl"></div>)}
            </div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {consultants.map((c: any) => (
                    <div key={c.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">
                                {c.user.gender === 'female' ? '👩‍⚕️' : '👨‍⚕️'}
                            </div>
                            <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                <Star size={14} className="fill-current" /> {c.average_rating}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                            {c.user.first_name} {c.user.last_name}
                        </h3>
                        <p className="text-blue-600 font-semibold text-sm mb-4">{c.specialization}</p>
                        <p className="text-slate-500 text-sm mb-6 line-clamp-2">{c.bio}</p>

                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                            <div className="font-bold text-lg text-slate-900">৳{c.base_rate_bdt} <span className="text-slate-400 text-xs font-normal">/hr</span></div>
                            <button className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 transition">
                                Book Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
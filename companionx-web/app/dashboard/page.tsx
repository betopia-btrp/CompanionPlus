"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { User, MessageSquare, Star, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecs();
  }, []);

  const fetchRecs = async () => {
    try {
      const res = await api.get("/dashboard/recommendations");
      setRecommendations(res.data);
    } catch (e) {
      console.error("Failed to fetch recs");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="p-20 text-center">Analysing your profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-slate-500 text-lg">
            Here are your personalized matches based on your onboarding answers.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {recommendations.map((consultant: any) => (
            <div
              key={consultant.id}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="bg-blue-100 p-4 rounded-2xl">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-current" />
                  {consultant.average_rating}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {consultant.user.first_name} {consultant.user.last_name}
              </h3>
              <p className="text-blue-600 font-semibold mb-4">
                {consultant.specialization}
              </p>

              <div className="bg-blue-50 p-4 rounded-2xl mb-6">
                <div className="flex gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400 tracking-wider">
                    Why we matched you
                  </span>
                </div>
                <p className="text-slate-700 italic">
                  "{consultant.match_reason}"
                </p>
              </div>

              <p className="text-slate-500 text-sm mb-8 line-clamp-2">
                {consultant.bio}
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900">
                    ৳{consultant.base_rate_bdt}
                  </span>
                  <span className="text-slate-400 text-sm"> / session</span>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors">
                  Book Session <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

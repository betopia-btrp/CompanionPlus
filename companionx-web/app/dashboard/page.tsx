"use client";
import Link from 'next/link';
import { BookOpen, Calendar, MessageCircle, PlayCircle, Star, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Fetch user info to show name
    api.get('/user').then(res => setUser(res.data));
  }, []);

  const ACTIONS = [
    { title: "Anonymous Booking", desc: "Match with professional consultants", icon: <Calendar className="w-8 h-8" />, href: "/dashboard/booking", color: "bg-blue-500" },
    { title: "Mood Journal", desc: "Track your emotions with AI analysis", icon: <BookOpen className="w-8 h-8" />, href: "/dashboard/journal", color: "bg-emerald-500" },
    { title: "Mental Lab", desc: "AI-generated personalized exercises", icon: <Star className="w-8 h-8" />, href: "/dashboard/exercises", color: "bg-purple-500" },
    { title: "Counseling Room", desc: "Join your private anonymous session", icon: <PlayCircle className="w-8 h-8" />, href: "/dashboard/room", color: "bg-rose-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div className="text-2xl font-black text-blue-600">CompanionX</div>
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-600">Hello, {user?.first_name || 'Friend'}</span>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            {user?.first_name[0]}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Mental Wellness Hub</h1>
          <p className="text-slate-500 text-lg">Your safe space for healing and growth.</p>
        </header>

        {/* 4 CORE ENDPOINTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {ACTIONS.map((action) => (
            <Link key={action.title} href={action.href}>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className={`${action.color} text-white p-4 rounded-2xl w-fit mb-6 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{action.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* BOTTOM SECTION (AI RECOMMENDATION PREVIEW) */}
        <div className="bg-blue-900 rounded-[2rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-xl text-center md:text-left">
              <h2 className="text-3xl font-bold mb-4 italic">"Healing is not linear."</h2>
              <p className="text-blue-100 text-lg">Your AI-suggested consultants are ready to meet you. Start your journey today.</p>
            </div>
            <Link href="/dashboard/booking" className="bg-white text-blue-900 px-8 py-4 rounded-2xl font-black hover:bg-blue-50 transition-colors whitespace-nowrap">
              View Recommended Consultants
            </Link>
          </div>
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}

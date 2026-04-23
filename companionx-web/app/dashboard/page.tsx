"use client";
import Link from "next/link";
import { BookOpen, Calendar, PlayCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";
import api from "@/lib/axios";

type RecommendedConsultant = {
  id: number;
  user_id: number;
  specialization: string;
  bio?: string | null;
  match_reason?: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
};

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recommendations, setRecommendations] = useState<
    RecommendedConsultant[]
  >([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);

      if (!currentUser) {
        setLoadingRecommendations(false);
        router.push("/login");
        return;
      }

      api
        .get("/api/dashboard/recommendations")
        .then((res) => setRecommendations(res.data ?? []))
        .catch(() => setRecommendations([]))
        .finally(() => setLoadingRecommendations(false));
    });
  }, [router]);

  const ACTIONS = [
    {
      title: "Anonymous Booking",
      desc: "Match with professional consultants",
      icon: <Calendar className="w-8 h-8" />,
      href: "/dashboard/booking",
      color: "bg-blue-500",
    },
    {
      title: "Mood Journal",
      desc: "Track your emotions with AI analysis",
      icon: <BookOpen className="w-8 h-8" />,
      href: "/dashboard/journal",
      color: "bg-emerald-500",
    },
    {
      title: "Mental Lab",
      desc: "AI-generated personalized exercises",
      icon: <Star className="w-8 h-8" />,
      href: "/dashboard/exercises",
      color: "bg-purple-500",
    },
    {
      title: "Counseling Room",
      desc: "Join your private anonymous session",
      icon: <PlayCircle className="w-8 h-8" />,
      href: "/dashboard/room",
      color: "bg-rose-500",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div className="text-2xl font-black text-blue-600">CompanionX</div>
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-600">
            Hello, {user?.first_name || "Friend"}
          </span>
          {authChecked && user?.system_role ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {user.system_role}
            </span>
          ) : null}
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            {user?.first_name?.[0] ?? "F"}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        {user && !user.onboarding_completed ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <p className="font-semibold">
              Finish onboarding to unlock matching.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              We&apos;ll still keep you on the dashboard, but completing
              onboarding helps us personalize consultant recommendations.
            </p>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="mt-3 inline-flex rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Complete onboarding
            </button>
          </div>
        ) : null}

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Mental Wellness Hub
          </h1>
          <p className="text-slate-500 text-lg">
            Your safe space for healing and growth.
          </p>
        </header>

        {/* 4 CORE ENDPOINTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {ACTIONS.map((action) => (
            <Link key={action.title} href={action.href}>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div
                  className={`${action.color} text-white p-4 rounded-2xl w-fit mb-6 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform`}
                >
                  {action.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* BOTTOM SECTION (AI RECOMMENDATION PREVIEW) */}
        <div className="bg-blue-900 rounded-[2rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div className="max-w-xl text-center lg:text-left">
              <h2 className="text-3xl font-bold mb-4 italic">
                "Healing is not linear."
              </h2>
              <p className="text-blue-100 text-lg">
                Your latest consultant match is loaded from the recommendation
                table.
              </p>
              <Link
                href="/dashboard/booking"
                className="mt-6 inline-flex bg-white text-blue-900 px-8 py-4 rounded-2xl font-black hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                View Recommended Consultants
              </Link>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recommended for you</h3>
                <span className="text-xs text-blue-100/80">
                  Latest `consultant_match`
                </span>
              </div>

              {loadingRecommendations ? (
                <div className="space-y-3">
                  <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
                  <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((consultant) => (
                    <div
                      key={consultant.id}
                      className="rounded-2xl bg-white/95 p-4 text-slate-900 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {consultant.user?.first_name ?? "Consultant"}{" "}
                            {consultant.user?.last_name ?? ""}
                          </p>
                          <p className="text-sm text-slate-600">
                            {consultant.specialization}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Match
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {consultant.match_reason ??
                          "Highly compatible with your profile."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-blue-100">
                  No recommendations yet. Finish onboarding or try remixing your
                  match.
                </div>
              )}
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}

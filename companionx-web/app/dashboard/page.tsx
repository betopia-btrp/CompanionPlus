"use client";

import Link from "next/link";
<<<<<<< HEAD
import { BookOpen, Calendar, LayoutDashboard, PlayCircle, Star } from "lucide-react";
=======
import { BookOpen, Calendar, PlayCircle, Star } from "lucide-react";
>>>>>>> main
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";
import api from "@/lib/axios";

type RecommendedConsultant = {
  id: number;
  specialization: string;
  match_reason?: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
};

type RecommendationResponse = {
  status: "ready" | "pending" | "missing_onboarding" | "unavailable";
  generated_at?: string | null;
  message?: string;
  profile_summary?: {
    primary_concern?: string;
    preferred_style?: string;
    duration?: string;
    keywords?: string[];
  } | null;
  matches: RecommendedConsultant[];
};

type CurrentUser = {
  first_name?: string;
  system_role?: "patient" | "consultant";
};

export default function Dashboard() {
<<<<<<< HEAD
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [recommendationData, setRecommendationData] =
    useState<RecommendationResponse | null>(null);
=======
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recommendations, setRecommendations] = useState<
    RecommendedConsultant[]
  >([]);
>>>>>>> main
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
<<<<<<< HEAD
    let ignore = false;

    api.get("/user").then((res) => {
      if (ignore) {
        return;
      }

      setUser(res.data);

      if (res.data?.system_role === "consultant") {
        setLoadingRecommendations(false);

=======
    fetchCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);

      if (!currentUser) {
        setLoadingRecommendations(false);
        router.push("/login");
>>>>>>> main
        return;
      }

      api
<<<<<<< HEAD
        .get("/dashboard/recommendations")
        .then((recommendationRes) => {
          if (!ignore) {
            setRecommendationData(recommendationRes.data);
          }
        })
        .catch((error) => {
          if (!ignore) {
            if (error.response?.data) {
              setRecommendationData(error.response.data);
            } else {
              setRecommendationData(null);
            }
          }
        })
        .finally(() => {
          if (!ignore) {
            setLoadingRecommendations(false);
          }
        });
    });

    return () => {
      ignore = true;
    };
  }, []);
=======
        .get("/api/dashboard/recommendations")
        .then((res) => setRecommendations(res.data ?? []))
        .catch(() => setRecommendations([]))
        .finally(() => setLoadingRecommendations(false));
    });
  }, [router]);
>>>>>>> main

  const isConsultant = user?.system_role === "consultant";

  const actions = isConsultant
    ? [
        {
          title: "Consultant Dashboard",
          desc: "Manage profile details and session slots",
          icon: <LayoutDashboard className="h-8 w-8" />,
          href: "/dashboard/consultant",
          color: "bg-blue-500",
        },
        {
          title: "Counseling Room",
          desc: "Join your private session room",
          icon: <PlayCircle className="h-8 w-8" />,
          href: "/dashboard/room",
          color: "bg-rose-500",
        },
      ]
    : [
        {
          title: "Anonymous Booking",
          desc: "Match with professional consultants",
          icon: <Calendar className="h-8 w-8" />,
          href: "/dashboard/booking",
          color: "bg-blue-500",
        },
        {
          title: "Mood Journal",
          desc: "Track your emotions with AI analysis",
          icon: <BookOpen className="h-8 w-8" />,
          href: "/dashboard/journal",
          color: "bg-emerald-500",
        },
        {
          title: "Mental Lab",
          desc: "AI-generated personalized exercises",
          icon: <Star className="h-8 w-8" />,
          href: "/dashboard/exercises",
          color: "bg-purple-500",
        },
        {
          title: "Counseling Room",
          desc: "Join your private anonymous session",
          icon: <PlayCircle className="h-8 w-8" />,
          href: "/dashboard/room",
          color: "bg-rose-500",
        },
      ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div className="text-2xl font-black text-blue-600">CompanionX</div>
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-600">
            Hello, {user?.first_name || "Friend"}
          </span>
<<<<<<< HEAD
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
=======
          {authChecked && user?.system_role ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {user.system_role}
            </span>
          ) : null}
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
>>>>>>> main
            {user?.first_name?.[0] ?? "F"}
          </div>
        </div>
      </nav>

<<<<<<< HEAD
      <main className="mx-auto max-w-7xl p-8 md:p-12">
=======
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

>>>>>>> main
        <header className="mb-12">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">
            {isConsultant ? "Consultant Control Center" : "Mental Wellness Hub"}
          </h1>
          <p className="text-lg text-slate-500">
            {isConsultant
              ? "Set up your profile, define time slots, and prepare for private sessions."
              : "Your safe space for healing and growth."}
          </p>
        </header>

        <div
          className={`mb-12 grid grid-cols-1 gap-6 ${
            isConsultant ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {actions.map((action) => (
            <Link key={action.title} href={action.href}>
              <div className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div
                  className={`${action.color} mb-6 w-fit rounded-2xl p-4 text-white shadow-lg shadow-blue-100 transition-transform group-hover:scale-110`}
                >
                  {action.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">
                  {action.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {isConsultant ? (
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-10 text-white shadow-2xl">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-xl">
                <h2 className="mb-4 text-3xl font-bold">
                  Scheduling comes first.
                </h2>
                <p className="text-lg text-slate-300">
                  Build your consultant profile, set your base session rate, and
                  publish clear availability windows before booking and payment
                  logic goes live.
                </p>
                <Link
                  href="/dashboard/consultant"
                  className="mt-6 inline-flex rounded-2xl bg-white px-8 py-4 font-black text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Open Consultant Dashboard
                </Link>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <h3 className="text-lg font-semibold">Current rollout step</h3>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  We are building the scheduling foundation first so slot locking,
                  payments, and Jitsi room creation can be layered on safely.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[2rem] bg-blue-900 p-10 text-white shadow-2xl">
            <div className="relative z-10 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-w-xl text-center lg:text-left">
                <h2 className="mb-4 text-3xl font-bold italic">
                  &ldquo;Healing is not linear.&rdquo;
                </h2>
                <p className="text-lg text-blue-100">
                  Your latest consultant match is generated from onboarding and
                  ready inside the booking experience.
                </p>
                <Link
                  href="/dashboard/booking"
                  className="mt-6 inline-flex whitespace-nowrap rounded-2xl bg-white px-8 py-4 font-black text-blue-900 transition-colors hover:bg-blue-50"
                >
                  View Recommended Consultants
                </Link>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Recommended for you</h3>
                  <span className="text-xs text-blue-100/80">
                    {recommendationData?.status ?? "matching"}
                  </span>
                </div>

                {loadingRecommendations ? (
                  <div className="space-y-3">
                    <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
                    <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
                  </div>
                ) : recommendationData?.status === "ready" &&
                  recommendationData.matches.length > 0 ? (
                  <div className="space-y-3">
                    {recommendationData.profile_summary && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100">
                        Focus:{" "}
                        <span className="font-semibold">
                          {recommendationData.profile_summary.primary_concern}
                        </span>
                      </div>
                    )}

                    {recommendationData.matches.map((consultant) => (
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
                ) : recommendationData?.status === "pending" ? (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-blue-100">
                    Your onboarding was saved. Consultant matching is still being
                    generated in the background.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-blue-100">
                    Complete onboarding to unlock your personalized consultant
                    matches.
                  </div>
                )}
              </div>
            </div>
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
          </div>
        )}
      </main>
    </div>
  );
}

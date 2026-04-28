"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import {
  Check,
  Crown,
  Lock,
  Sparkle,
  Spinner,
  X,
} from "@phosphor-icons/react";

type Plan = {
  id: number;
  name: string;
  price: number;
  billing_interval: string;
  features: Record<string, boolean | number | null>;
  sort_order: number;
};

type PlansResponse = {
  plans: Plan[];
};

const FEATURE_LABELS: Record<string, string> = {
  ai_exercise_personalization: "AI Exercise Personalization",
  ai_consultant_recommendations: "AI Consultant Matching",
  free_sessions: "Free Sessions Per Month",
  max_available_hours_per_month: "Available Hours Per Month",
  platform_fee_percentage: "Platform Fee",
};

function formatFeatureValue(key: string, value: boolean | number | null): string {
  if (value === null) return "Unlimited";
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (key === "platform_fee_percentage") return `${value}%`;
  if (key === "free_sessions" || key === "max_available_hours_per_month") return String(value);
  return String(value);
}

function isFeatureActive(value: boolean | number | null, plan: Plan): boolean {
  if (typeof value === "boolean") return value;
  if (value === null) return true;
  return (value as number) > 0;
}

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    api.get<PlansResponse>("/api/subscription/plans")
      .then((res) => setPlans(res.data.plans))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId && !completeLoading && !message) {
      setCompleteLoading(true);
      api.post("/api/subscription/complete", { session_id: sessionId })
        .then(() => {
          setMessage("Welcome to Pro! Your AI-powered features are now available.");
          fetchCurrentUser().then(setUser);
          setShowConfetti(true);
        })
        .catch(() => {
          setMessage("Something went wrong. Please contact support.");
        })
        .finally(() => {
          setCompleteLoading(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.pathname);
        });
    }
  }, [sessionId]);

  useEffect(() => {
    if (showConfetti && !confettiFired.current) {
      confettiFired.current = true;
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#6366f1", "#a78bfa", "#c4b5fd"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#6366f1", "#a78bfa", "#c4b5fd"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [showConfetti]);

  const handleCheckout = async (plan: Plan) => {
    if (plan.price === 0) return;
    setCheckoutLoading(plan.id);
    try {
      const res = await api.post("/api/subscription/checkout", {
        plan_id: plan.id,
        success_url: `${window.location.origin}/pricing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/pricing`,
      });
      window.location.href = res.data.url;
    } catch {
      setMessage("Failed to initiate checkout.");
      setCheckoutLoading(null);
    }
  };

  const currentPlanName = user && (user as any).active_subscription
    ? plans.find((p) => p.name === (user as any).subscription_plan?.name)?.name ?? "Free"
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 md:px-10 lg:px-12">
        <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
          CompanionX
        </span>
        {user ? (
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => router.push("/register")}>
              Get Started
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 md:px-10 lg:px-12">
        <div className="mb-12 text-center">
          <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Pricing
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
            Choose Your Plan
          </h1>
          <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-muted-foreground">
            {plans[0]?.features?.ai_consultant_recommendations !== undefined
              ? "Unlock AI-powered consultant matching, personalized exercises, and more."
              : "Pick the right plan for your practice."}
          </p>
        </div>

        {message && (
          <div className={`mx-auto mb-10 max-w-lg rounded-none border p-4 text-center font-sans text-sm ${
            showConfetti
              ? "border-primary/60 bg-primary/10 text-foreground"
              : "border-primary/40 bg-primary/5 text-foreground"
          }`}>
            {completeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size={16} className="animate-spin" />
                Processing payment...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {showConfetti && <Sparkle size={16} weight="fill" className="text-primary" />}
                {message}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = currentPlanName === plan.name;
            const isFree = plan.price === 0;
            const featureEntries = Object.entries(plan.features ?? {});

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col border bg-card transition-colors ${
                  isCurrent
                    ? "border-primary/60"
                    : isFree
                      ? "border-border"
                      : "border-border hover:border-primary/40"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-none bg-primary px-3 py-1 font-sans text-xs font-medium text-primary-foreground">
                      <Crown size={12} weight="fill" />
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="border-b border-border px-6 py-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      {plan.name}
                    </h2>
                    {isFree ? (
                      <span className="rounded-none border border-border px-2 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                        Free
                      </span>
                    ) : (
                      <Crown size={18} weight="fill" className="text-amber-500" />
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-heading text-4xl font-bold text-foreground">
                      {isFree ? "৳0" : `৳${plan.price}`}
                    </span>
                    <span className="font-sans text-sm text-muted-foreground">
                      /{plan.billing_interval}
                    </span>
                  </div>
                </div>

                <div className="flex-1 px-6 py-6">
                  <p className="mb-5 font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Features
                  </p>
                  <ul className="space-y-3">
                    {featureEntries.map(([key, value]) => (
                      <li key={key} className="flex items-start gap-3">
                        {isFeatureActive(value, plan) ? (
                          <Check
                            size={14}
                            weight="bold"
                            className="mt-0.5 shrink-0 text-primary"
                          />
                        ) : (
                          <X
                            size={14}
                            weight="bold"
                            className="mt-0.5 shrink-0 text-muted-foreground/40"
                          />
                        )}
                        <span
                          className={`font-sans text-sm ${
                            isFeatureActive(value, plan)
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          }`}
                        >
                          {FEATURE_LABELS[key] ?? key}
                          <span className="ml-1 font-medium text-foreground/60">
                            {formatFeatureValue(key, value)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border px-6 py-5">
                  {isCurrent ? (
                    <Button disabled className="w-full text-sm font-medium">
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full text-sm font-medium"
                    >
                      Free Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full text-sm font-medium"
                      onClick={() => handleCheckout(plan)}
                      disabled={checkoutLoading === plan.id}
                    >
                      {checkoutLoading === plan.id ? (
                        <span className="flex items-center gap-2">
                          <Spinner size={14} className="animate-spin" />
                          Redirecting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Lock size={14} weight="bold" />
                          Upgrade Now
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

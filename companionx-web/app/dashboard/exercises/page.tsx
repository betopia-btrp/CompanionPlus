"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Crown,
  Lightning,
  Trophy,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type PlanItem = {
  id: number;
  title: string;
  description: string;
  estimated_time: string | null;
  origin: "template" | "ai";
  status: "not_started" | "in_progress" | "completed";
  completion_percentage: number;
  badge_name: string | null;
};

export default function ExercisesListPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [canAccessAi, setCanAccessAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/api/dashboard/exercises")
      .then((res) => {
        setPlans(res.data?.plans ?? []);
        setCanAccessAi(res.data?.can_access_ai ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-3xl px-8 py-10 space-y-4">
          <div className="h-6 w-48 animate-pulse bg-muted" />
          <div className="h-5 w-64 animate-pulse bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse border border-border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const templatePlans = plans.filter((p) => p.origin === "template");
  const aiPlans = plans.filter((p) => p.origin === "ai");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <header className="mb-8">
          <div>
            <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Adaptive Exercises
            </p>
            <h1 className="font-heading text-xl font-semibold text-foreground mt-1">
              Mental Lab
            </h1>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Pick an exercise to start. Each session guides you through
              grounding, reflection, and action.
            </p>
          </div>
        </header>

        {/* Upgrade CTA for free users */}
        {!canAccessAi && (
          <div className="mb-8 border border-primary/15 bg-primary/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Crown size={20} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground">
                    Get AI-Adaptive Exercise Plans
                  </p>
                  <p className="mt-1 font-sans text-sm text-muted-foreground max-w-lg">
                    Upgrade to Pro for personalized plans generated from your journal entries
                    and mood patterns.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 text-xs font-medium"
                onClick={() => router.push("/pricing")}
              >
                Upgrade to Pro
                <ArrowRight size={14} weight="bold" />
              </Button>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="border border-dashed border-border bg-card p-10 text-center">
            <Brain size={32} weight="thin" className="mx-auto text-muted-foreground" />
            <p className="mt-4 font-heading text-sm font-medium text-foreground">
              No exercises available yet
            </p>
            <p className="mt-2 font-sans text-xs text-muted-foreground">
              Check back soon for new guided exercises.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {templatePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => router.push(`/dashboard/exercises/${plan.id}`)}
                className="w-full border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:bg-primary/3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-semibold text-foreground">
                      {plan.title}
                    </p>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      {plan.estimated_time && (
                        <span className="font-sans text-xs text-muted-foreground">
                          {plan.estimated_time}
                        </span>
                      )}
                      {plan.badge_name && (
                        <span className="inline-flex items-center gap-1 font-sans text-xs text-amber-600">
                          <Trophy size={12} weight="fill" />
                          {plan.badge_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {plan.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-primary">
                        <CheckCircle size={14} weight="bold" />
                        Done
                      </span>
                    ) : plan.status === "in_progress" ? (
                      <div className="w-20">
                        <Progress value={plan.completion_percentage} className="h-1" />
                        <p className="mt-1 font-sans text-xs text-muted-foreground text-right">
                          {plan.completion_percentage}%
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-muted-foreground">
                        <Lightning size={12} weight="bold" />
                        Start
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* AI plans section for premium users */}
            {aiPlans.length > 0 && (
              <>
                <div className="mt-6 mb-2">
                  <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Your AI Plans
                  </p>
                </div>
                {aiPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => router.push(`/dashboard/exercises/${plan.id}`)}
                    className="w-full border border-primary/20 bg-primary/[0.02] p-5 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-heading text-base font-semibold text-foreground">
                          {plan.title}
                        </p>
                        <p className="mt-1 font-sans text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {plan.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 font-sans text-xs text-primary">
                            <CheckCircle size={14} weight="bold" />
                            Done
                          </span>
                        ) : plan.status === "in_progress" ? (
                          <div className="w-20">
                            <Progress value={plan.completion_percentage} className="h-1" />
                            <p className="mt-1 font-sans text-xs text-muted-foreground text-right">
                              {plan.completion_percentage}%
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

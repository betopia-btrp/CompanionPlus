"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type SelectQuestion = {
  key: string;
  label: string;
  type: "select";
  options: string[];
};

type RangeQuestion = {
  key: string;
  label: string;
  type: "range";
  min: number;
  max: number;
};

type Question = SelectQuestion | RangeQuestion;

const QUESTIONS: Question[] = [
  {
    key: "primary_concern",
    label: "What is the primary area you'd like to focus on?",
    type: "select",
    options: [
      "Anxiety & Overthinking",
      "Low Mood & Depression",
      "Career & Workplace Stress",
      "Academic Pressure",
      "Relationship Issues",
      "Personal Growth",
    ],
  },
  {
    key: "duration",
    label: "How long has this been a concern for you?",
    type: "select",
    options: ["A few days", "A few weeks", "Several months", "A year or more"],
  },
  {
    key: "mood_scale",
    label:
      "On a scale of 1-10, how would you rate your mood over the last week?",
    type: "range",
    min: 1,
    max: 10,
  },
  {
    key: "sleep_impact",
    label: "How is your sleep being affected?",
    type: "select",
    options: [
      "Sleeping too much",
      "Difficulty falling asleep",
      "Waking up frequently",
      "No impact on sleep",
    ],
  },
  {
    key: "daily_functioning",
    label: "How much does this concern interfere with your work or studies?",
    type: "select",
    options: [
      "Not at all",
      "Slightly",
      "Significantly",
      "I am unable to function",
    ],
  },
  {
    key: "physical_symptoms",
    label:
      "Do you experience physical symptoms like chest pain, headaches, or fatigue?",
    type: "select",
    options: ["Never", "Occasionally", "Frequently"],
  },
  {
    key: "social_life",
    label: "How has your social life been lately?",
    type: "select",
    options: [
      "I enjoy seeing people",
      "I am avoiding social contact",
      "I feel lonely even with people",
    ],
  },
  {
    key: "therapist_style",
    label: "What style of counseling do you prefer?",
    type: "select",
    options: [
      "Action-oriented (CBT/Tools)",
      "Gentle & Empathetic (Listening)",
      "Deep-dive (Past/Childhood)",
      "I am not sure",
    ],
  },
  {
    key: "emergency_check",
    label: "In the past month, have you had thoughts of hurting yourself?",
    type: "select",
    options: ["No, never", "Rarely", "Occasionally", "Yes, frequently"],
  },
  {
    key: "commitment",
    label: "On a scale of 1-10, how ready are you to start this journey?",
    type: "range",
    min: 1,
    max: 10,
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const router = useRouter();
  const q = QUESTIONS[currentStep];
  const currentValue = answers[q.key];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
  const currentRangeValue =
    q.type === "range" && typeof currentValue === "number"
      ? currentValue
      : undefined;
  const currentRangeProgress =
    q.type === "range" && currentRangeValue !== undefined
      ? ((currentRangeValue - q.min) / (q.max - q.min)) * 100
      : 0;
  const isCurrentQuestionAnswered =
    q.type === "select"
      ? typeof currentValue === "string" && currentValue.trim().length > 0
      : typeof currentValue === "number";

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitOnboarding();
    }
  };

  const submitOnboarding = async () => {
    try {
      await api.post("/onboarding", { answers });
      alert("Onboarding complete! Generating your recommendations...");
      router.push("/dashboard");
    } catch {
      alert("Error saving answers");
    }
  };
  const selectAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
    handleNext();
  };

  const updateRangeAnswer = (value: number) => {
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground md:px-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)," +
            "repeating-linear-gradient(0deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)",
        }}
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-105 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="w-full max-w-3xl border border-border bg-card">
        <div className="border-b border-border px-6 py-6 md:px-8">
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-[28px] leading-tight font-bold md:text-[32px]">
                Tailoring your journey
              </h1>
              <p className="mt-2 font-sans text-sm text-muted-foreground">
                Your answers shape recommendation quality and therapist
                matching.
              </p>
            </div>
            <span className="shrink-0 font-sans text-xs text-muted-foreground">
              {currentStep + 1} / {QUESTIONS.length}
            </span>
          </div>

          <Progress value={progress} className="mt-5" />
        </div>

        <div className="space-y-8 px-6 py-8 md:px-8">
          <div>
            <p className="font-sans text-xs text-muted-foreground">
              Question {currentStep + 1} of {QUESTIONS.length}
            </p>
            <h2 className="mt-2 font-heading text-2xl leading-snug font-bold md:text-[30px]">
              {q.label}
            </h2>
          </div>

          {q.type === "select" && (
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt) => (
                <Button
                  key={opt}
                  variant={currentValue === opt ? "default" : "outline"}
                  size="lg"
                  onClick={() => selectAnswer(opt)}
                  className={`h-auto w-full justify-start px-5 py-4 text-left font-sans text-sm transition-all duration-150 ${
                    currentValue === opt
                      ? "text-primary-foreground hover:bg-primary/90"
                      : "text-foreground hover:border-primary/35 hover:bg-primary/5"
                  }`}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {q.type === "range" && (
            <div className="border border-border bg-background p-5">
              <div className="mb-4 flex items-center justify-between font-sans text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2 md:grid-cols-10">
                {Array.from(
                  { length: q.max - q.min + 1 },
                  (_, i) => q.min + i,
                ).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={
                      currentRangeValue === value ? "default" : "outline"
                    }
                    className="h-9 px-0"
                    onClick={() => updateRangeAnswer(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
            <Button
              variant="outline"
              size="lg"
              className="px-5"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            >
              Back
            </Button>

            <Button
              size={"lg"}
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered}
            >
              {currentStep === QUESTIONS.length - 1
                ? "Start your Journey"
                : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

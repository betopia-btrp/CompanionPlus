"use client";
import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";

const QUESTIONS = [
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
  const [answers, setAnswers] = useState<any>({});
  const router = useRouter();

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
    } catch (e) {
      alert("Error saving answers");
    }
  };

  const q = QUESTIONS[currentStep];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white p-10 rounded-3xl shadow-2xl border border-blue-100">
        <div className="w-full bg-slate-100 h-2 rounded-full mb-8">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${((currentStep + 1) / QUESTIONS.length) * 100}%`,
            }}
          ></div>
        </div>

        <h3 className="text-sm font-bold text-blue-500 mb-2">
          Question {currentStep + 1} of 10
        </h3>
        <h2 className="text-2xl font-bold text-slate-800 mb-8">{q.label}</h2>

        {q.type === "select" && (
          <div className="grid grid-cols-1 gap-3">
            {q.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setAnswers({ ...answers, [q.key]: opt });
                  handleNext();
                }}
                className="w-full p-4 text-left border rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === "text" && (
          <div className="space-y-4">
            <textarea
              className="w-full p-4 border rounded-2xl h-32 focus:ring-2 focus:ring-blue-500"
              onChange={(e) =>
                setAnswers({ ...answers, [q.key]: e.target.value })
              }
            />
            <button
              onClick={handleNext}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold"
            >
              Continue
            </button>
          </div>
        )}

        {q.type === "range" || q.type === "number" ? (
          <div className="space-y-4">
            <input
              type={q.type}
              min="1"
              max="10"
              className="w-full"
              onChange={(e) =>
                setAnswers({ ...answers, [q.key]: e.target.value })
              }
            />
            <button
              onClick={handleNext}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold"
            >
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

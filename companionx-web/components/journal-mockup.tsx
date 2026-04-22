"use client";

import { useMemo, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type MoodKey = "happy" | "anxious" | "neutral" | "sad";

type MoodOption = {
  key: MoodKey;
  label: string;
  emoji: string;
  note: string;
  insight: string;
  accentClass: string;
};

const moodOptions: MoodOption[] = [
  {
    key: "happy",
    label: "Happy",
    emoji: "😊",
    note: "I felt lighter after taking a short walk and a breathing break.",
    insight: "Positive trend detected. Keep the same routine tomorrow.",
    accentClass: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10",
  },
  {
    key: "anxious",
    label: "Anxious",
    emoji: "😟",
    note: "Work pressure is rising and I keep replaying decisions in my head.",
    insight:
      "Anxiety pattern detected across recent entries. Recommend grounding + breathing exercise.",
    accentClass: "text-amber-500 border-amber-500/40 bg-amber-500/10",
  },
  {
    key: "neutral",
    label: "Neutral",
    emoji: "😐",
    note: "Today was steady. No major highs or lows in mood.",
    insight: "Mood is stable. Add one reflective prompt to improve awareness.",
    accentClass: "text-sky-500 border-sky-500/40 bg-sky-500/10",
  },
  {
    key: "sad",
    label: "Sad",
    emoji: "😔",
    note: "Low energy and reduced motivation throughout the afternoon.",
    insight:
      "Low mood detected. A short check-in with your consultant may help today.",
    accentClass: "text-violet-500 border-violet-500/40 bg-violet-500/10",
  },
];

export default function JournalMockup() {
  const [selectedMood, setSelectedMood] = useState<MoodKey>("anxious");
  const activeMood = useMemo(
    () =>
      moodOptions.find((mood) => mood.key === selectedMood) ?? moodOptions[1],
    [selectedMood],
  );
  const [entryText, setEntryText] = useState(activeMood.note);

  return (
    <div className="relative overflow-hidden border border-border/70 bg-card/90 p-6 shadow-lg backdrop-blur rounded-none">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-primary/10 to-transparent" />

      <div className="relative grid gap-5">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div>
            <p className="font-sans text-xs font-medium text-muted-foreground">
              Mood journal
            </p>
            <p className="mt-1 font-sans text-sm text-foreground">Today</p>
          </div>
          <span className="inline-flex items-center gap-2 border border-border bg-background/70 px-3 py-1 font-sans text-xs text-muted-foreground rounded-none">
            <span className="h-1.5 w-1.5 bg-emerald-500" />
            Encrypted
          </span>
        </div>

        <div className="space-y-2">
          <p className="font-sans text-xs text-muted-foreground">
            How are you feeling right now?
          </p>
          <div className="flex flex-wrap gap-2">
            {moodOptions.map((mood) => {
              const isActive = mood.key === selectedMood;
              return (
                <button
                  key={mood.key}
                  type="button"
                  onClick={() => {
                    setSelectedMood(mood.key);
                    setEntryText(mood.note);
                  }}
                  className={`border px-3 py-1.5 font-sans text-xs font-medium transition-colors rounded-none ${
                    isActive
                      ? mood.accentClass
                      : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {mood.emoji} {mood.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="font-sans text-xs text-muted-foreground">
            Entry preview
          </p>
          <textarea
            value={entryText}
            onChange={(event) => setEntryText(event.target.value)}
            rows={4}
            className="h-24 w-full resize-none overflow-y-auto border border-border/80 bg-background/70 p-3 font-sans text-sm leading-relaxed text-foreground outline-none focus:border-primary rounded-none"
          />
        </div>

        <div className="border border-primary/25 bg-primary/10 p-4 rounded-none">
          <p className="mb-1 inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-primary">
            <Sparkle size={14} weight="fill" /> AI insight
          </p>
          <p className="min-h-10 font-sans text-sm text-foreground">
            {activeMood.insight}
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="px-4 text-xs font-medium"
          >
            Analyze entry
          </Button>
        </div>
      </div>
    </div>
  );
}

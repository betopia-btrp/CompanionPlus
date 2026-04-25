"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { VideoCamera, PhoneSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function RoomPage() {
  const searchParams = useSearchParams();
  const roomUuid = searchParams.get("room");
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!roomUuid) return;
    const timer = window.setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [roomUuid]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!roomUuid) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background flex items-center justify-center">
        <div className="border border-border bg-card p-10 text-center max-w-md">
          <VideoCamera size={32} weight="thin" className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            No Session Selected
          </h2>
          <p className="font-sans text-sm text-muted-foreground mb-6">
            Join a session from your bookings or schedule to start a video call.
          </p>
          <Button
            size="sm"
            className="text-xs font-medium"
            onClick={() => router.push("/dashboard/bookings")}
          >
            Go to Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {/* ── Session Header ──────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 font-sans text-xs font-medium text-primary uppercase">
            <VideoCamera size={14} weight="bold" />
            Session Active
          </span>
          <span className="font-mono text-sm text-muted-foreground">
            {formatElapsed(elapsed)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => router.push("/dashboard")}
        >
          <PhoneSlash size={14} weight="bold" />
          End Session
        </Button>
      </div>

      {/* ── Jitsi iframe ─────────────────────────────────────────── */}
      <div className="relative w-full" style={{ height: "calc(100vh - 3.5rem - 65px)" }}>
        <iframe
          src={`https://meet.jit.si/${roomUuid}`}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="absolute inset-0 w-full h-full border-0"
          title="Video Session"
        />
      </div>
    </div>
  );
}

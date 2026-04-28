"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth";
import api from "@/lib/axios";
import { VideoCamera, PhoneSlash, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function RoomPage() {
  const searchParams = useSearchParams();
  const roomUuid = searchParams.get("room");
  const bookingId = searchParams.get("bookingId");
  const router = useRouter();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isConsultant, setIsConsultant] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        setIsConsultant(u.system_role === "consultant");
        const isPatient = u.system_role === "patient";
        if (isPatient) {
          const hash = u.id.toString(16).toUpperCase().padStart(4, "0").slice(-4);
          setUserName(`User #${hash}`);
        } else {
          setUserName(`${u.first_name} ${u.last_name}`);
        }
      }
    });
  }, []);

  const endSession = async () => {
    if (isConsultant && bookingId) {
      try {
        await api.post(`/api/bookings/${bookingId}/complete-session`);
      } catch {
        // silent
      }
    }
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    router.push("/dashboard");
  };

  useEffect(() => {
    if (!roomUuid || !userName || !jitsiContainerRef.current) return;

    const domain = "meet.jit.si";
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;

    script.onload = () => {
      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      const api = new JitsiMeetExternalAPI(domain, {
        roomName: roomUuid,
        parentNode: jitsiContainerRef.current,
        configOverrides: {
          prejoinPageEnabled: false,
          enableLobby: false,
          doNotStoreRoom: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          toolbarButtons: [
            "microphone", "camera", "closedcaptions", "desktop",
            "fullscreen", "fodeviceselection", "hangup",
            "profile", "chat", "raisehand",
            "tileview", "settings",
          ],
        },
        interfaceConfigOverrides: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_PRESENCE_STATUS: true,
        },
        userInfo: {
          displayName: userName,
        },
      });

      jitsiApiRef.current = api;
      setLoading(false);

      api.addListener("readyToClose", () => {
        endSession();
      });
    };

    document.body.appendChild(script);

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      const scriptEl = document.querySelector(`script[src="https://${domain}/external_api.js"]`);
      if (scriptEl) scriptEl.remove();
    };
  }, [roomUuid, userName]);

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
          onClick={endSession}
        >
          <PhoneSlash size={14} weight="bold" />
          End Session
        </Button>
      </div>

      {/* ── Jitsi container ────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center" style={{ height: "calc(100vh - 3.5rem - 65px)" }}>
          <div className="text-center">
            <Spinner size={24} className="mx-auto mb-3 animate-spin text-muted-foreground" />
            <p className="font-sans text-sm text-muted-foreground">
              Joining session as {userName}...
            </p>
          </div>
        </div>
      )}
      <div
        ref={jitsiContainerRef}
        className="w-full"
        style={{ height: "calc(100vh - 3.5rem - 65px)", display: loading ? "none" : "block" }}
      />
    </div>
  );
}

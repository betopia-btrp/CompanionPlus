"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import {
  ArrowLeft,
  LoaderCircle,
  Save,
  ShieldCheck,
} from "lucide-react";

type ConsultantProfile = {
  consultant: {
    id: number;
    name: string;
    email: string;
    is_approved: boolean;
    specialization: string;
    bio?: string | null;
    base_rate_bdt: number;
    average_rating: number;
  };
};

export default function ConsultantProfilePage() {
  const [data, setData] = useState<ConsultantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    specialization: "",
    bio: "",
    base_rate_bdt: "0",
  });

  useEffect(() => {
    let ignore = false;

    api
      .get("/api/consultant/dashboard")
      .then((res) => {
        if (!ignore) {
          setData(res.data);
          setForm({
            specialization: res.data.consultant.specialization ?? "",
            bio: res.data.consultant.bio ?? "",
            base_rate_bdt: String(res.data.consultant.base_rate_bdt ?? 0),
          });
        }
      })
      .catch((error) => {
        console.error("Failed to load profile", error);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      await api.patch("/api/consultant/profile", {
        specialization: form.specialization,
        bio: form.bio || null,
        base_rate_bdt: Number(form.base_rate_bdt),
      });
      setStatusMessage("Profile updated.");
    } catch (error) {
      console.error("Failed to update profile", error);
      setStatusMessage("Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-sans text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Consultant
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Profile Settings
          </h1>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-12 animate-pulse border border-border bg-muted" />
            <div className="h-24 animate-pulse border border-border bg-muted" />
            <div className="h-12 animate-pulse border border-border bg-muted" />
          </div>
        ) : (
          <div className="border border-border bg-card p-6">
            {/* ── Status ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span className="font-heading text-sm font-semibold text-foreground">
                  {data?.consultant.name ?? "Consultant"}
                </span>
              </div>
              <span
                className={`font-sans text-[10px] font-medium uppercase tracking-wider border px-2 py-0.5 ${
                  data?.consultant.is_approved
                    ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                    : "border-amber-500/40 text-amber-700 bg-amber-500/10"
                }`}
              >
                {data?.consultant.is_approved ? "Approved" : "Pending"}
              </span>
            </div>

            {/* ── Form ────────────────────────────────────────────── */}
            <div className="space-y-5">
              <div>
                <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Specialization
                </label>
                <input
                  value={form.specialization}
                  onChange={(e) =>
                    setForm({ ...form, specialization: e.target.value })
                  }
                  className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Session Rate (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.base_rate_bdt}
                  onChange={(e) =>
                    setForm({ ...form, base_rate_bdt: e.target.value })
                  }
                  className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Bio
                </label>
                <textarea
                  rows={5}
                  value={form.bio}
                  onChange={(e) =>
                    setForm({ ...form, bio: e.target.value })
                  }
                  className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            {/* ── Actions ──────────────────────────────────────────── */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary px-5 py-3 font-sans text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Profile
              </button>
            </div>

            {statusMessage && (
              <p className="mt-4 font-sans text-xs text-foreground">
                {statusMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

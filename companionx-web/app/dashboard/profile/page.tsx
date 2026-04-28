"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  User,
  Envelope,
  Phone,
  Crown,
  ArrowLeft,
  ShieldCheck,
} from "@phosphor-icons/react";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  // Consultant fields
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [conSaving, setConSaving] = useState(false);
  const [conSaved, setConSaved] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      setFirstName(u.first_name ?? "");
      setLastName(u.last_name ?? "");
      setEmail(u.email ?? "");
      setPhone("");
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/api/profile")
      .then((res) => {
        if (res.data.phone) setPhone(res.data.phone);
        if (res.data.subscription_end_date)
          setSubscriptionEnd(res.data.subscription_end_date);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user?.system_role !== "consultant") return;
    api
      .get("/api/consultant/dashboard")
      .then((res) => {
        const c = res.data.consultant;
        setSpecialization(c.specialization ?? "");
        setBio(c.bio ?? "");
        setBaseRate(String(c.base_rate_bdt ?? 0));
        setIsApproved(c.is_approved ?? false);
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/api/profile", {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleConsultantSave = async () => {
    setConSaving(true);
    setConSaved(false);
    try {
      await api.patch("/api/consultant/profile", {
        specialization,
        bio: bio || null,
        base_rate_bdt: Number(baseRate),
      });
      setConSaved(true);
      setTimeout(() => setConSaved(false), 3000);
    } catch {
      /* ignore */
    } finally {
      setConSaving(false);
    }
  };

  const planName = user?.subscription_plan?.name ?? "Free";
  const isPremium = planName !== "Free";
  const features =
    user?.subscription_plan?.features ??
    ({} as Record<string, boolean | number | null>);
  const isPatient = user?.system_role === "patient";
  const isConsultant = user?.system_role === "consultant";

  const featureLabels: Record<string, string> = isPatient
    ? {
        ai_exercise_personalization: "AI Exercise Personalization",
        ai_consultant_recommendations: "AI Consultant Matching",
        free_sessions: "Free Sessions Available",
      }
    : isConsultant
      ? {
          max_available_hours_per_month: "Available Hours Per Month",
          platform_fee_percentage: "Platform Fee",
        }
      : {};

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
          <div className="h-8 w-40 animate-pulse bg-muted" />
          <div className="mt-8 h-64 animate-pulse border border-border bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center gap-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} weight="bold" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {isConsultant ? "Consultant" : "Account"}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">
            Profile Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Plan card */}
          {user?.system_role !== "admin" && <div className="border border-border bg-card">
            <div className={`h-1 ${isPremium ? "bg-amber-500" : "bg-primary"}`} />
            <div className="p-8">
              <div className="flex items-start justify-between mb-7">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center border ${isPremium ? "border-amber-500/30 bg-amber-500/10" : "border-primary/20 bg-primary/5"}`}
                  >
                    <Crown
                      size={22}
                      weight={isPremium ? "fill" : "regular"}
                      className={isPremium ? "text-amber-500" : "text-primary"}
                    />
                  </div>
                  <div>
                    <p className="font-sans text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Current Plan
                    </p>
                    <p className="mt-1 font-heading text-2xl font-bold text-foreground tracking-tight">
                      {planName}
                    </p>
                  </div>
                </div>
                {!isPremium && (
                  <button
                    onClick={() => router.push("/pricing")}
                    className="font-sans text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Upgrade →
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {Object.entries(featureLabels).map(([key, label]) => {
                  const val = features[key];
                  const enabled = val === true || (typeof val === "number" && val > 0);
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 px-4 py-3 ${enabled ? "bg-primary/[0.02]" : "bg-muted/20"}`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center border ${enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
                      >
                        {enabled ? (
                          <CheckCircle size={12} weight="bold" className="text-primary" />
                        ) : (
                          <XCircle size={12} weight="bold" className="text-muted-foreground/50" />
                        )}
                      </div>
                      <span
                        className={`font-sans text-sm ${enabled ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {label}
                        {typeof val === "number" && val > 0 && (
                          <span className="ml-1.5 font-sans text-xs text-muted-foreground">({val})</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-6 border-t border-border pt-5">
                {isPatient && user?.free_sessions_remaining !== undefined && (
                  <div>
                    <p className="font-sans text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Free Sessions Left
                    </p>
                    <p className="mt-0.5 font-heading text-lg font-semibold text-foreground">
                      {user.free_sessions_remaining}
                    </p>
                  </div>
                )}
                {subscriptionEnd && (
                  <div>
                    <p className="font-sans text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Expires
                    </p>
                    <p className="mt-0.5 font-sans text-sm text-foreground">
                      {new Date(subscriptionEnd).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>}

          {/* Personal Information */}
          <div className="border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <User size={20} weight="thin" className="text-primary" />
              <div>
                <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Personal Information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-xs text-muted-foreground mb-1.5">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-muted-foreground mb-1.5">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-xs text-muted-foreground mb-1.5">
                  <Envelope size={12} className="inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-muted-foreground mb-1.5">
                  <Phone size={12} className="inline mr-1" />
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button size="sm" className="text-xs font-medium" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && <span className="font-sans text-xs text-primary">Profile updated successfully.</span>}
            </div>
          </div>

          {/* Consultant settings */}
          {isConsultant && (
            <div className="border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} weight="bold" className="text-primary" />
                  <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Consultant Profile
                  </p>
                </div>
                <span
                  className={`font-sans text-[10px] font-medium uppercase tracking-wider border px-2 py-0.5 ${
                    isApproved
                      ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-700 bg-amber-500/10"
                  }`}
                >
                  {isApproved ? "Approved" : "Pending"}
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Specialization
                  </label>
                  <input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
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
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bio
                  </label>
                  <textarea
                    rows={5}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button size="sm" className="text-xs font-medium" onClick={handleConsultantSave} disabled={conSaving}>
                  {conSaving ? "Saving..." : "Save Profile"}
                </Button>
                {conSaved && <span className="font-sans text-xs text-primary">Consultant profile updated.</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

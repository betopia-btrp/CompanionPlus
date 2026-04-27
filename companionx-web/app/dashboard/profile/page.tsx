"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { User, Envelope, Phone, Crown, ArrowLeft } from "@phosphor-icons/react";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/api/profile", { first_name: firstName, last_name: lastName, email, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const planName = user?.subscription_plan?.name ?? "Free";
  const isPremium = planName !== "Free";

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
            Account
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">
            Profile Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Plan card */}
          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Crown size={20} weight={isPremium ? "fill" : "regular"} className={isPremium ? "text-amber-500" : "text-muted-foreground"} />
              <div>
                <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Current Plan
                </p>
                <p className="mt-0.5 font-heading text-lg font-semibold text-foreground">
                  {planName}
                </p>
              </div>
            </div>
            {!isPremium && (
              <Button
                size="sm"
                className="mt-4 text-xs font-medium"
                onClick={() => router.push("/pricing")}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Profile form */}
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
              <Button
                size="sm"
                className="text-xs font-medium"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && (
                <span className="font-sans text-xs text-primary">
                  Profile updated successfully.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

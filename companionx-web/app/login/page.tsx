"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/login", { email, password });

      localStorage.setItem("token", res.data.token);

      if (res.data.user.onboarding_completed) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      console.error(err);
      alert("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative flex min-h-screen items-center justify-center px-6 py-16 md:px-12">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)," +
              "repeating-linear-gradient(0deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)",
          }}
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-105 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative w-full max-w-140 border border-border bg-card p-8 md:p-10">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground md:text-[34px]">
              Access Your Anonymous Account
            </h1>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Continue securely to your private wellness dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="font-sans text-muted-foreground">
                Clinical Email
              </label>
              <Input
                type="email"
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="font-sans text-muted-foreground">
                Secure Password
              </label>
              <Input
                type="password"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className={"w-full"}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="font-sans">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center font-sans text-xs text-muted-foreground">
            New here?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:opacity-80"
            >
              Create Account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

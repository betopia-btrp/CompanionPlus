"use client";
import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Send login request to Laravel
      const res = await api.post("/login", { email, password });
      
      // 2. Save the token
      localStorage.setItem("token", res.data.token);
      
      // 3. Check if they finished onboarding. 
      // If yes -> Dashboard. If no -> Onboarding.
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-bold text-blue-600 text-center mb-2">Welcome Back</h2>
        <p className="text-slate-500 text-center mb-8">Sign in to your account</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="Email Address" required
            className="w-full p-4 border rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full p-4 border rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500">
          New here? <Link href="/register" className="text-blue-600 font-bold">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    dob: "",
    gender: "male",
    guardian_contact: "",
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/register", formData);
      // Save token for future requests
      localStorage.setItem("token", response.data.token);
      // Success! Move to login
      router.push("/login");
      // Success! Move to onboarding
      router.push("/onboarding");
    } catch (error: any) {
      console.error(
        "Registration failed:",
        error.response?.data || error.message,
      );
      alert(
        error.response?.data?.message ||
          "Registration failed. Check your details.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <h2 className="text-3xl font-bold text-slate-800 mb-2 text-center">
          Create Account
        </h2>
        <p className="text-slate-500 text-center mb-8">
          Join the CompanionX community.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              required
              className="p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Last Name"
              required
              className="p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
            />
          </div>

          <input
            type="email"
            placeholder="Email Address"
            required
            className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Phone (e.g., 017...)"
            required
            className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Password"
              required
              className="p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Confirm"
              required
              className="p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password_confirmation: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1 ml-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                className="p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1 ml-1">Gender</label>
              <select
                className="p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <input
            type="text"
            placeholder="Guardian Contact (Emergency)"
            required
            className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) =>
              setFormData({ ...formData, guardian_contact: e.target.value })
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg disabled:bg-blue-300"
          >
            {loading ? "Creating Account..." : "Register Now"}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-500 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-bold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

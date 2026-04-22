"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RegisterPage() {
  const [identity, setIdentity] = useState<"user" | "consultant">("user");
  const [date, setDate] = useState<Date | undefined>(undefined);
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
      localStorage.setItem("token", response.data.token);
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
        <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[420px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative w-full max-w-[560px] border border-border bg-card p-8 md:p-10">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground md:text-[34px]">
              Create Your Anonymous Account
            </h1>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Protocol initialization for clinical session management.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-sans text-muted-foreground">
                Identity Selection
              </label>
              <div className="mt-2 grid grid-cols-2 border border-border">
                <button
                  type="button"
                  onClick={() => setIdentity("user")}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
                    identity === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setIdentity("consultant")}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
                    identity === "consultant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Consultant
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="font-sans text-muted-foreground">
                  First Name
                </label>
                <Input
                  type="text"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="font-sans text-muted-foreground">
                  Last Name
                </label>
                <Input
                  type="text"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="font-sans text-muted-foreground">
                Clinical Email
              </label>
              <Input
                type="email"
                required
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div>
              <label className="font-sans text-muted-foreground">
                Contact Phone
              </label>
              <Input
                type="text"
                required
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="font-sans text-muted-foreground">
                  Secure Password
                </label>
                <Input
                  type="password"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="font-sans text-muted-foreground">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  required
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_confirmation: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="font-sans text-muted-foreground">
                  Date of Birth
                </label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant={"outline"}
                        data-empty={!date}
                        size={"lg"}
                        className={"w-full"}
                      >
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                        <ChevronDownIcon data-icon="inline-end" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selected) => {
                        setDate(selected);
                        setFormData((prev) => ({
                          ...prev,
                          dob: selected
                            ? selected.toISOString().split("T")[0]
                            : "",
                        }));
                      }}
                      defaultMonth={date}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="font-sans text-muted-foreground">
                  Gender
                </label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      gender: value ?? prev.gender,
                    }))
                  }
                >
                  <SelectTrigger className="w-full h-11 border border-border bg-background px-4">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Gender</SelectLabel>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-sans text-muted-foreground">
                Guardian Contact (Emergency)
              </label>
              <Input
                type="text"
                required
                onChange={(e) =>
                  setFormData({ ...formData, guardian_contact: e.target.value })
                }
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={"w-full"}
              size="lg"
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="font-sans">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center font-sans text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:opacity-80"
            >
              Sign In
            </Link>
          </p>

          <div className="mt-8 border-t border-border pt-6">
            <p className="font-sans text-xs font-semibold text-foreground">
              Privacy Aligned
            </p>
            <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
              Your sessions remain anonymous by design. All data is encrypted
              and processed with clinical-grade safeguards.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

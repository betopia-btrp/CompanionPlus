"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import JournalMockup from "@/components/journal-mockup";
import {
  Fingerprint,
  CalendarBlank,
  VideoCamera,
  EyeSlash,
  Brain,
  Barbell,
  ShieldCheck,
  Warning,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  const avatarLabel =
    `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.trim() || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 md:px-10 lg:px-12">
        <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
          CompanionX
        </span>

        <div className="hidden items-center gap-7 font-sans text-[14px] font-medium text-foreground/80 md:flex">
          {[
            { label: "How it Works", href: "#how-it-works" },
            { label: "Features", href: "#features" },
            { label: "Stories", href: "#testimonials" },
            { label: "Pricing", href: "/pricing" },
            { label: "For Consultants", href: "/register" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="border-b border-transparent pb-0.5 transition-colors duration-150 hover:border-primary hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <Button
              variant="outline"
              size="default"
              className="h-10 w-10 rounded-full px-0 text-sm font-semibold"
              onClick={() => router.push("/dashboard")}
              aria-label="Go to dashboard"
            >
              {avatarLabel}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="default"
                className="hidden px-4 text-sm font-medium md:inline-flex"
                onClick={() => router.push("/login")}
              >
                Sign In
              </Button>
              <Button
                variant="default"
                size="default"
                className="px-4 text-sm font-medium"
                onClick={() => router.push("/register")}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-155 items-center overflow-hidden border-b border-border">
      {/* subtle grid bg */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.3]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)," +
            "repeating-linear-gradient(0deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)",
        }}
      />
      <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-120 w-120 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-30 -left-20 -z-10 h-100 w-100 rounded-full bg-primary/3 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.01] via-transparent to-primary/[0.02]" />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-8 py-20 md:px-12 lg:grid-cols-2">
        {/* Left */}
        <div className="space-y-8">
          <p className="inline-flex border border-primary/30 bg-primary/5 px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.14em] text-primary">
            Trusted by 500+ members worldwide
          </p>

          <h1 className="font-heading text-[42px] leading-[1.15] font-bold text-foreground md:text-[52px]">
            You don&apos;t have to{" "}
            <span className="text-primary">face it alone.</span>
          </h1>

          <p className="max-w-md font-sans text-[17px] leading-relaxed text-muted-foreground">
            Professional, anonymous mental wellness support for a stigma-free
            journey. Built on technical precision and deep human empathy.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant={"default"} size={"lg"} className="px-6 text-sm">
              Find a Consultant <ArrowRightIcon weight="bold" />
            </Button>
            <Button variant={"outline"} size={"lg"} className="px-6 text-sm">
              Start Journaling
            </Button>
          </div>
        </div>

        {/* Right — journal mockup */}
        <JournalMockup />
      </div>
    </section>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { num: "100%", label: "Anonymous Sessions" },
    { num: "60s", label: "Safety Alert SLA" },
    { num: "5+", label: "AI Exercises / Week" },
    { num: "24/7", label: "Active Support" },
  ];
  return (
    <div className="grid grid-cols-2 border-b border-border md:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`px-10 py-7 ${
            i < stats.length - 1 ? "border-r border-border" : ""
          }`}
        >
          <div className="font-heading text-3xl font-bold text-primary">
            {s.num}
          </div>
          <div className="mt-1 font-sans text-xs text-muted-foreground">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: <Fingerprint size={32} weight="thin" />,
      title: "Register Anonymously",
      body: "Secure your identity with our zero-knowledge protocol. Your privacy is our foundational architectural pillar.",
    },
    {
      num: "02",
      icon: <CalendarBlank size={32} weight="thin" />,
      title: "Book a Consultant",
      body: "Select from our vetted network of clinical experts ranked by compatibility with your unique mood profile.",
    },
    {
      num: "03",
      icon: <VideoCamera size={32} weight="thin" />,
      title: "Join a Private Session",
      body: "Connect through encrypted Jitsi video in a safe, controlled digital environment built for healing.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-b border-border px-8 py-24 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 border-l-[3px] border-primary pl-6">
          <h2 className="font-heading text-[30px] font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            The Structured Journey to Wellbeing
          </p>
        </div>

        <div className="grid grid-cols-1 border border-border md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`group h-full p-10 transition-colors duration-200 hover:bg-muted/40 ${
                i < steps.length - 1
                  ? "border-b border-border md:border-r md:border-b-0"
                  : ""
              }`}
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="text-primary">{step.icon}</span>
                <span className="font-heading text-[56px] leading-none font-bold text-border transition-colors select-none group-hover:text-primary/10">
                  {step.num}
                </span>
              </div>
              <h3 className="mb-3 font-heading text-[20px] font-bold text-foreground">
                {step.title}
              </h3>
              <p className="font-sans text-[14px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: <EyeSlash size={22} weight="thin" />,
      title: "Anonymous Video",
      body: "Face-to-face connection without compromising your personal identity data. UUID-named Jitsi rooms.",
    },
    {
      icon: <Brain size={22} weight="thin" />,
      title: "AI Mood Journaling",
      body: "Intelligent sentiment analysis that tracks your progress through linguistic patterns asynchronously.",
    },
    {
      icon: <Barbell size={22} weight="thin" />,
      title: "Personalized Exercises",
      body: "Clinical-grade coping tasks tailored to your last 7 days of mood data. Regenerated on every visit.",
    },
    {
      icon: <ShieldCheck size={22} weight="thin" />,
      title: "Safe & Confidential",
      body: "Suicidal ideation detection with a 60-second admin alert SLA. Zero PII exposed at any step.",
    },
  ];

  return (
    <section
      id="features"
      className="scroll-mt-24 border-b border-border bg-muted/30 px-8 py-24 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center md:mb-16">
          <p className="mb-3 font-sans text-xs text-muted-foreground">
            Built for real outcomes
          </p>
          <h2 className="mb-4 font-heading text-[32px] font-bold text-foreground md:text-[36px]">
            Precision-Engineered Care
          </h2>
          <p className="mx-auto max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
            Every layer is intentionally designed — from private sessions to AI
            guidance — so support feels calm, intelligent, and dependable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, index) => (
            <div
              key={f.title}
              className="group relative flex h-full flex-col gap-5 border border-border bg-card p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/3"
            >
              <div className="flex items-center justify-between">
                <div className="border border-border bg-background p-2 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                  {f.icon}
                </div>
              </div>
              <h4 className="font-sans text-[15px] font-semibold text-foreground">
                {f.title}
              </h4>
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why CompanionX ───────────────────────────────────────────────────────────
function WhySection() {
  const items = [
    { num: "100%", label: "Anonymous" },
    { num: "AI", label: "Powered Care" },
    { num: "500+", label: "Licensed Experts" },
    { num: "24/7", label: "Active Support" },
  ];
  return (
    <section className="border-b border-border bg-background px-8 py-24 md:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-12 text-center md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 font-heading text-[52px] leading-none font-bold text-primary">
              {item.num}
            </div>
            <div className="font-sans text-xs text-muted-foreground">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      initials: "A.J.",
      quote:
        "The anonymity allowed me to speak my truth without fear of societal repercussions. A truly clinical approach.",
      since: "Member since 2022",
    },
    {
      initials: "L.K.",
      quote:
        "The journaling AI picked up on patterns I hadn't even noticed. It's like having a technical blueprint for my mind.",
      since: "Member since 2023",
    },
    {
      initials: "S.R.",
      quote:
        "Reliable, stable, and quiet. CompanionX doesn't shout — it supports with precision and care.",
      since: "Member since 2023",
    },
  ];

  return (
    <section
      id="testimonials"
      className="scroll-mt-24 border-b border-border bg-muted/30 px-8 py-24 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-[30px] font-bold text-foreground">
            Voices of Progress
          </h2>
        </div>

        <div className="grid grid-cols-1 border border-border md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.initials}
              className={`flex h-full flex-col justify-between bg-card p-8 ${
                i < testimonials.length - 1
                  ? "border-b border-border md:border-r md:border-b-0"
                  : ""
              }`}
            >
              <p className="mb-8 font-heading text-[16px] leading-relaxed text-muted-foreground italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center border border-primary font-sans text-xs font-bold text-primary">
                  {t.initials}
                </div>
                <span className="font-sans text-[10px] text-muted-foreground">
                  {t.since}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Safety Banner ────────────────────────────────────────────────────────────
function SafetyBanner() {
  return (
    <div className="mx-8 my-10 md:mx-12">
      <div className="flex items-start gap-5 border border-destructive/30 bg-destructive/5 p-6">
        <Warning
          size={20}
          weight="thin"
          className="mt-0.5 shrink-0 text-destructive"
        />
        <div>
          <h3 className="mb-1 font-heading text-[16px] font-bold text-foreground">
            Your safety is a system requirement, not a feature.
          </h3>
          <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
            Suicidal ideation detection runs on a priority queue with a
            60-second admin alert SLA — using only your internal ID, never your
            name or email.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  const router = useRouter();

  return (
    <section className="border-b border-border bg-foreground px-8 py-20 md:px-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-10 md:flex-row">
        <div>
          <h2 className="mb-3 font-heading text-[36px] leading-tight font-bold text-background">
            Take the first step today.
          </h2>
          <p className="max-w-md font-sans text-[15px] leading-relaxed text-background/60">
            Your journey toward mental wellness begins with a single, private
            connection. No real name required at any step.
          </p>
        </div>
        <Button
          size="lg"
          className="shrink-0 px-8 text-xs font-bold whitespace-nowrap"
          onClick={() => router.push("/register")}
        >
          Sign Up For CompanionX
          <ArrowRightIcon weight="bold" />
        </Button>
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <WhySection />
      <Testimonials />
      <SafetyBanner />
      <CTA />
      <SiteFooter />
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import {
  Fingerprint,
  CalendarBlank,
  VideoCamera,
  EyeSlash,
  Brain,
  Barbell,
  ShieldCheck,
  ArrowRight,
  Warning,
} from "@phosphor-icons/react";

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm transition-shadow duration-300`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8 md:px-12">
        <span className="font-heading text-lg font-bold tracking-tight text-foreground uppercase">
          CompanionX
        </span>

        <div className="hidden items-center gap-8 font-sans text-sm font-medium tracking-widest uppercase md:flex">
          {["How it Works", "Features", "Consultants"].map((link) => (
            <a
              key={link}
              href="#"
              className="border-b border-transparent pb-0.5 text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="hidden border border-border px-5 py-2 font-sans text-xs font-semibold tracking-widest text-foreground uppercase transition-colors duration-150 hover:border-primary hover:text-primary md:inline-flex"
          >
            Sign In
          </Link>
          <button className="bg-primary px-5 py-2 font-sans text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-all duration-100 hover:opacity-90 active:scale-[0.98]">
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-[620px] items-center overflow-hidden border-b border-border">
      {/* subtle grid bg */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)," +
            "repeating-linear-gradient(0deg,oklch(0.922 0 0) 0px,oklch(0.922 0 0) 1px,transparent 1px,transparent 48px)",
        }}
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-8 py-20 md:px-12 lg:grid-cols-2">
        {/* Left */}
        <div className="space-y-8">
          <span className="inline-block border border-primary/30 bg-primary/5 px-3 py-1 font-sans text-[11px] font-semibold tracking-[0.1em] text-primary uppercase">
            Clinical Wellness · Bangladesh
          </span>

          <h1 className="font-heading text-[42px] leading-[1.15] font-bold text-foreground md:text-[52px]">
            You don&apos;t have to{" "}
            <span className="text-primary">face it alone.</span>
          </h1>

          <p className="max-w-md font-sans text-[17px] leading-relaxed text-muted-foreground">
            Professional, anonymous mental wellness support for a stigma-free
            journey. Built on technical precision and deep human empathy.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button className="inline-flex items-center gap-2 bg-primary px-7 py-3.5 font-sans text-[11px] font-semibold tracking-widest text-primary-foreground uppercase transition-all hover:opacity-90">
              Find a Consultant <ArrowRight size={14} weight="bold" />
            </button>
            <button className="inline-flex items-center gap-2 border border-border px-7 py-3.5 font-sans text-[11px] font-semibold tracking-widest text-foreground uppercase transition-all hover:border-foreground">
              Start Journaling
            </button>
          </div>
        </div>

        {/* Right — journal mockup */}
        <div className="relative border border-border bg-card p-8">
          <div className="absolute h-16 w-16 border-primary/40" />
          <div className="absolute h-16 w-16 border-primary/40" />

          <p className="mb-5 font-sans text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
            Mood Journal · Today
          </p>

          <div className="mb-5 flex flex-wrap gap-2">
            {["😊 Happy", "😟 Anxious", "😐 Neutral", "😔 Sad"].map(
              (chip, i) => (
                <span
                  key={chip}
                  className={`cursor-default border px-3 py-1.5 font-sans text-[12px] font-medium ${
                    i === 1
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {chip}
                </span>
              ),
            )}
          </div>

          <div className="mb-5 min-h-[90px] border border-border p-4 font-sans text-[13px] leading-relaxed text-muted-foreground">
            Feeling a bit overwhelmed with work lately. Hard to focus and I keep
            second-guessing decisions…
          </div>

          <div className="border-l-[3px] border-primary bg-primary/5 px-4 py-3">
            <p className="mb-1 font-sans text-[10px] font-semibold tracking-widest text-primary uppercase">
              AI Insight
            </p>
            <p className="font-sans text-[13px] text-foreground">
              Anxiety pattern detected over 3 days. 2 exercises recommended.
            </p>
          </div>
        </div>
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
          <div className="mt-1 font-sans text-[11px] tracking-widest text-muted-foreground uppercase">
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
    <section className="border-b border-border px-8 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 border-l-[3px] border-primary pl-6">
          <h2 className="font-heading text-[30px] font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-1 font-sans text-[11px] tracking-widest text-muted-foreground uppercase">
            The Structured Journey to Wellbeing
          </p>
        </div>

        <div className="grid grid-cols-1 border border-border md:grid-cols-3">
          {steps.map((step, i) => (
            <div
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
    <section className="border-b border-border bg-muted/30 px-8 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 font-heading text-[30px] font-bold text-foreground">
            Precision-Engineered Care
          </h2>
          <div className="mx-auto h-[2px] w-12 bg-primary" />
        </div>

        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div className="flex h-full flex-col gap-5 bg-card p-8 transition-colors duration-200 hover:bg-primary/[0.03]">
              <div className="text-primary">{f.icon}</div>
              <h4 className="font-sans text-[11px] font-bold tracking-[0.1em] text-foreground uppercase">
                {f.title}
              </h4>
              <p className="font-sans text-[14px] leading-relaxed text-muted-foreground">
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
        {items.map((item, i) => (
          <div>
            <div className="mb-2 font-heading text-[52px] leading-none font-bold text-primary">
              {item.num}
            </div>
            <div className="font-sans text-[11px] tracking-widest text-muted-foreground uppercase">
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
    <section className="border-b border-border bg-muted/30 px-8 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-[30px] font-bold text-foreground">
            Voices of Progress
          </h2>
        </div>

        <div className="grid grid-cols-1 border border-border md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
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
                <div className="flex h-9 w-9 items-center justify-center border border-primary font-sans text-[11px] font-bold text-primary">
                  {t.initials}
                </div>
                <span className="font-sans text-[10px] tracking-widest text-muted-foreground uppercase">
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
        <button className="shrink-0 bg-primary px-10 py-4 font-sans text-[11px] font-bold tracking-widest whitespace-nowrap text-primary-foreground uppercase transition-all hover:opacity-90 active:scale-[0.98]">
          Sign Up For CompanionX
        </button>
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

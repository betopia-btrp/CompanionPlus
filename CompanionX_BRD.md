# BUSINESS REQUIREMENTS DOCUMENT
## CompanionX — AI-Powered Mental Wellness Platform

| Field | Details |
|---|---|
| Project Name | CompanionX |
| Date Submitted | April 16, 2026 |
| Document Status | Draft |
| Version | 1.0 |

---

## 1. Executive Summary

CompanionX is a privacy-first, AI-powered mental wellness platform designed to connect users with certified mental health consultants through an anonymous, secure, and accessible digital environment. The platform addresses the growing demand for mental health support in Bangladesh and beyond, where stigma and accessibility barriers prevent many individuals from seeking help.

The system provides three core roles — **Users**, **Consultants**, and **Admins** — each with a dedicated dashboard. Users can anonymously book video counselling sessions, track their mood through a digital journal, receive AI-powered exercise recommendations, and make secure upfront payments via Stripe. Consultants manage availability, set weekly templates, and conduct video sessions via Jitsi Meet. Admins oversee platform operations, approve consultant registrations, manage bookings, and moderate safety alerts and blog content.

The platform is built on a modern, scalable stack: Next.js (frontend), Laravel (backend API), PostgreSQL (database), Stripe (payments), and Jitsi (video).

---

## 2. Project Objectives

- Provide a safe, anonymous platform for users to access mental health counselling without fear of identity exposure.
- Enable seamless booking of video counselling sessions with upfront payment via Stripe.
- Offer a mood journaling feature with sentiment analysis and AI-generated exercises tied to emotional patterns.
- Deliver AI-powered consultant matching and personalized exercise plans based on user onboarding and mood history.
- Implement a freemium subscription model (Free/Pro for patients, Free/Premium for consultants) with tiered features.
- Integrate Jitsi Meet for free, anonymous, no-account-required video counselling.
- Build on a scalable, modern stack (Next.js + Laravel + PostgreSQL) suitable for future mobile and API expansion.

---

## 3. Project Scope

### 3.1 In Scope

- User registration, login, and session-based authentication
- Consultant registration and admin-based approval workflow
- Anonymous booking system with consultant availability management (weekly templates + overrides)
- Stripe payment integration — upfront full payment for sessions and recurring subscription billing
- Mood Journal — emoji-based mood logging with optional text notes and AI sentiment analysis
- AI-powered exercise generation — personalized mental wellness exercises triggered by mood entries and onboarding
- AI-powered consultant matching — personalized recommendations based on onboarding responses
- Onboarding flow — captures user context for AI matching and exercise personalization
- Jitsi Meet video counselling — auto-generated private room per booking
- Three role-based dashboards: User (patient), Consultant, Admin
- Subscription plans with freemium model (Free/Pro for patients, Free/Premium for consultants)
- Admin controls: manage users, consultants, bookings, safety alerts, blog content, approve consultants
- Consultant schedule management: weekly availability templates, one-off overrides, monthly hour limits

### 3.2 Out of Scope

- Mobile application (iOS/Android)
- Session cancellation and refund flow
- Community posts and Circle Talk features
- Consultant earnings/payout management
- Multi-language support
- SMS/email notifications
- Dark/light mode toggle

---

## 4. Business Requirements

| Priority | Critical Level | Requirement Description |
|---|---|---|
| 1 | Critical | Users must be able to register and book a counselling session anonymously without revealing personal identity. |
| 2 | Critical | Payment via Stripe must be collected in full before a booking is confirmed. |
| 3 | Critical | Jitsi Meet video room must be auto-generated per booking and accessible only to the booked user and consultant. |
| 4 | Critical | Three separate dashboards must exist for User, Consultant, and Admin roles with role-based access control. |
| 5 | Critical | Subscription plans with tiered features (Free/Pro for patients, Free/Premium for consultants) must gate AI features and session limits. |
| 6 | High | Consultants must only become visible for booking after admin approval. |
| 7 | High | Users must be able to log mood entries with emoji selection and optional text notes in the Mood Journal. |
| 8 | High | AI-powered exercise recommendations must be generated based on user mood and onboarding context. |
| 9 | High | AI-powered consultant matching must be generated based on user onboarding responses. |
| 10 | High | Admin must have the ability to view, manage, and approve consultants and bookings on the platform. |
| 11 | Medium | Consultant must be able to set and update their availability calendar via weekly templates and one-off overrides. |
| 12 | Medium | Free consultants must have a configurable monthly booking hour limit enforced at checkout (default: 10 hours). |
| 13 | Medium | All session video links must be private and unique per booking. |

---

## 5. Key Stakeholders

| Name / Role | Job Role | Duties |
|---|---|---|
| TEAM 1 | Project Manager & Lead Developer | Full-stack development, system architecture, deployment, and project delivery. |
| Platform Users | End Users (Patients) | Register anonymously, book sessions, pay via Stripe, use Mood Journal, attend video sessions. |
| Mental Health Consultants | Service Providers | Register on platform, await admin approval, set availability, conduct video counselling sessions. |
| Platform Admin | System Administrator | Approve consultants, manage users and bookings, oversee safety alerts, moderate blog content. |
| Stripe | Payment Gateway Partner | Process upfront session payments and handle recurring subscription billing. |
| Jitsi Meet | Video Infrastructure Provider | Provide free, open-source, anonymous video conferencing rooms for counselling sessions. |

---

## 6. Project Constraints

| Constraint | Description |
|---|---|
| Time | The entire platform must be designed, developed, and tested within 3 days (approximately 12-18 total working hours). |
| Experience Level | The team is a beginner in both Next.js and Laravel, increasing risk of configuration delays and learning curve overhead. |
| Budget | Zero budget for infrastructure. Platform relies on free tiers: Jitsi Meet (free), Stripe (test mode), PostgreSQL (local). |
| Scope Restriction | Features are strictly limited to core functionalities to meet the 3-day deadline. No feature creep permitted. |
| Stack Complexity | Running Next.js and Laravel as separate services requires correct CORS configuration and token-based auth — a known risk for beginners. |

---

## 7. Cost-Benefit Analysis

### Costs

| Cost Item | Estimated Cost |
|---|---|
| Laravel Herd (Local Dev) | Free |
| Next.js | Free (Open Source) |
| PostgreSQL | Free (Open Source) |
| Jitsi Meet Video | Free (Open Source) |
| Stripe (Test Mode) | Free — 2.9% + $0.30 per live transaction |
| Developer Time (Solo, ~18 hrs) | Opportunity cost only |
| Hosting (Future) | ~$5-20/month (e.g. Railway, Render, or DigitalOcean) |
| **Total Immediate Cost** | **$0 (Development Phase)** |

### Benefits

| Benefit | Expected Value |
|---|---|
| Accessible Mental Health Support | Reduces barriers to counselling for users who fear stigma or identity exposure. |
| Scalable Architecture | Next.js + Laravel stack easily extends to mobile API, more features, and higher traffic. |
| Revenue Potential | The platform earns per-session booking fees via Stripe and recurring subscription revenue. |
| Academic / Portfolio Value | Demonstrates full-stack, AI-adjacent, payment-integrated projects to employers and institutions. |
| Community Impact | Addresses a real mental health gap in Bangladesh where professional support is underutilised. |

**Total Estimated Cost:** $0 (Development Phase)
**Expected ROI:** High — scalable SaaS model with per-session revenue, recurring subscriptions, low operating cost, and strong social impact value.

---

## 8. Business Model

### 8.1 Overview

CompanionX operates as a privacy-first, two-sided digital marketplace connecting individuals seeking anonymous mental health support with verified professional consultants. The platform earns revenue by facilitating transactions between these two groups, while layering AI-powered features that create independent subscription value on top of the core booking service.

The model is built on three interlocking pillars:

- **Transaction facilitation** — CompanionX takes a commission on every session payment processed through Stripe, earning revenue each time a connection between user and consultant results in a completed session.
- **Subscription upsell** — A freemium tier structure converts engaged free users into recurring subscribers by gating advanced AI features behind a monthly fee.
- **Platform trust infrastructure** — By handling verification, anonymity, safety alerting, and payment security, CompanionX creates a safe environment that neither users nor consultants could easily replicate independently.

### 8.2 Two-Sided Marketplace Dynamics

| | Users (Patients) | Consultants |
|---|---|---|
| Primary need | Anonymous, affordable counselling access | Efficient digital practice management |
| What they pay | Session fee + optional subscription | Commission on completed sessions |
| Core fear | Identity exposure, stigma | Unreliable bookings, admin burden |
| Platform value | Anonymity, AI matching, exercises | Verified profile, guaranteed payment, Jitsi |

### 8.3 Growth Flywheel

More verified consultants → Richer AI recommendations → More user bookings → More commission revenue → Investment in AI quality → Better AI → Better consultant matches → Higher session completion rates → More consultant earnings → More consultants join

### 8.4 Unit Economics (Illustrative)

| Scenario | Conservative | Target |
|---|---|---|
| Average session price | ৳1,100 | ৳1,500 |
| Platform commission (Free consultant) | 10% | 10% |
| Platform commission (Premium consultant) | 3% | 3% |
| Gross per session | ৳110 | ৳150 |
| After Stripe (2.9%+৳15) | ~৳73 | ~৳111 |
| Monthly sessions (platform) | 200 | 800 |
| Session revenue (net) | ~৳14,600 | ~৳88,800 |
| Subscription MRR (est.) | ৳10,000 | ৳50,000 |

---

## 9. Revenue Streams

### 9.1 Patient Subscription Plans

| Tier | Price | Free Sessions/Mo | AI Exercises | AI Matching | Target User |
|---|---|---|---|---|---|
| Free | ৳0/month | 2 | No | No | First-time users, stigma-sensitive explorers |
| Pro | ৳9.99/month | 4 | Yes | Yes | Regular users seeking personalized support |

### 9.2 Consultant Subscription Plans

| Tier | Price | Monthly Hours | Platform Fee | Target User |
|---|---|---|---|---|
| Free | ৳0/month | 10 hours | 10% | New consultants, part-time practitioners |
| Premium | ৳29.99/month | Unlimited | 3% | Full-time consultants, high-volume practitioners |

### 9.3 Session Commission

CompanionX collects a platform fee on every paid session. The rate depends on the **consultant's** plan:

| Consultant Plan | Platform Fee |
|---|---|
| Free | 10% |
| Premium | 3% |

Free session credits (from patient subscriptions) are fully covered by the platform — the consultant receives the full session amount.

### 9.4 Subscription Revenue Flow

1. User registers with Free plan → gets 2 free sessions/month
2. User upgrades to Pro (৳9.99/month via Stripe) → gets 4 free sessions/month + AI features
3. Free sessions reset monthly per subscription period
4. After free sessions exhausted, user pays per session via Stripe one-time payment

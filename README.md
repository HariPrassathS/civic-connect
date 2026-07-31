# Civic Connect TN

**Smart Civic Issue Management Platform** — Transparent | Accountable | AI-Powered | Time-Bound Resolution

A full-stack civic complaint management system built with Next.js 16, Supabase, and AI (Groq). Features 9 role-based dashboards, an 8-level auto-escalation engine, AI-powered categorization, real-time analytics, and a PWA-ready mobile experience.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres + RLS + Realtime) |
| Auth | Supabase Auth (Email/Password) |
| File Storage | Supabase Storage |
| AI | Groq API (LLaMA models) |
| Charts | Recharts |
| Maps | Leaflet + OpenStreetMap |
| PWA | Service Worker + Web Manifest |

## Prerequisites

- Node.js 18+ 
- A [Supabase](https://supabase.com) project (free tier works)
- A [Groq](https://console.groq.com) API key (free tier)
- (Optional) [Resend](https://resend.com) API key for email notifications
- (Optional) [Firebase](https://firebase.google.com) project for push notifications (FCM)
- (Optional) [Twilio](https://twilio.com) account for SMS notifications

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd civic-connect
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (for server-only operations) |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |
| `RESEND_API_KEY` | ❌ | Resend API key for email notifications |
| `CRON_SECRET` | ❌ | Secret token to protect cron endpoints |
| `NEXT_PUBLIC_FIREBASE_CONFIG` | ❌ | Firebase config JSON for push notifications |
| `TWILIO_ACCOUNT_SID` | ❌ | Twilio SID (behind feature flag) |
| `TWILIO_AUTH_TOKEN` | ❌ | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | ❌ | Twilio sender phone number |
| `ENABLE_SMS` | ❌ | Set to `true` to enable SMS (default: `false`) |

### 3. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy the URL and keys
3. Run all migrations in order from `supabase/migrations/`:
   - Open **SQL Editor** in your Supabase dashboard
   - Paste and run each file: `00001_extensions.sql` through `00011_settings.sql`
4. Run `supabase/seed.sql` to create demo users and test data

Or if you have the Supabase CLI linked:
```bash
npx supabase db push
```

### 4. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Demo Accounts

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@civicconnect.demo` | `Password123!` |
| Field Worker | `fieldworker@civicconnect.demo` | `Password123!` |
| Area Officer | `areaofficer@civicconnect.demo` | `Password123!` |
| Department Head | `depthead@civicconnect.demo` | `Password123!` |
| Commissioner | `commissioner@civicconnect.demo` | `Password123!` |
| District Collector | `collector@civicconnect.demo` | `Password123!` |
| Chief Secretary | `chiefsecretary@civicconnect.demo` | `Password123!` |
| Chief Minister | `chiefminister@civicconnect.demo` | `Password123!` |
| Admin | `admin@civicconnect.demo` | `Password123!` |

## Deploy to Vercel

1. Push your code to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local` to Vercel's Environment Variables settings
4. Deploy — Vercel auto-detects Next.js

### Cron Jobs (Post-Deploy)

Set up Vercel Cron or an external cron service to hit:
- `GET /api/cron/escalate` — every 15-30 minutes (auto-escalation engine)
- `GET /api/cron/reminders` — every 15-30 minutes (SLA reminders)
- `GET /api/cron/insights` — once daily (AI insights generation)

Add `CRON_SECRET` to env vars and pass it as `Authorization: Bearer <secret>` header.

## Enabling SMS (Twilio)

SMS is behind a feature flag. To enable:

1. Sign up for a [Twilio](https://twilio.com) account
2. Add the following to your `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ENABLE_SMS=true
   ```
3. The notification system will automatically start sending SMS alerts on status changes and escalations

## Multi-language Support

Translation files are in `messages/`:
- `en.json` — English (default)
- `hi.json` — Hindi

To add a new language, create a new JSON file following the same structure and register it in `lib/i18n.ts`.

## Project Structure

```
civic-connect/
├── app/
│   ├── (public)/          # Landing, submit-issue, nearby, about
│   ├── (auth)/            # Login, signup, callback
│   ├── dashboard/
│   │   ├── citizen/       # Citizen dashboard + complaint detail
│   │   ├── field-worker/  # Field worker dashboard
│   │   ├── area-officer/  # Area officer dashboard
│   │   └── department-head/ # Department head + analytics
│   ├── admin/             # Admin console (users, depts, categories, escalation)
│   └── api/cron/          # Cron endpoints (escalate, reminders, insights)
├── components/
│   ├── ui/                # shadcn primitives
│   ├── complaints/        # Complaint-specific components
│   ├── dashboards/        # DashboardShell
│   ├── analytics/         # Charts, heatmap, AI insights
│   └── shared/            # NotificationBell, etc.
├── lib/
│   ├── supabase/          # Client/server/middleware
│   ├── ai/                # Groq AI (categorize, priority, sentiment, insights)
│   ├── escalation/        # SLA rules + engine
│   └── i18n.ts            # Translation utility
├── messages/              # i18n translation JSON files
├── supabase/
│   ├── migrations/        # 11 SQL migration files
│   └── seed.sql           # Demo data
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # PWA icons
└── types/                 # TypeScript type definitions
```

## License

MIT

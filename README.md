# FluentFive — Master English Fluency in 5 Daily Activities

A production-ready English-fluency trainer built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## 🎯 What is FluentFive?

FluentFive helps you think, speak, read, and write fluently in English through 5 science-backed daily activities:

1. **Shadowing** — Listen to model sentences and record yourself to compare pronunciation
2. **Speak & Think Out Loud** — Respond to prompts for 2 minutes with live speech-to-text
3. **Active Reading + Chunks** — Read passages, save useful phrases, explore definitions
4. **Write & Rewrite** — Draft, check grammar with LanguageTool, then polish your rewrite
5. **Spaced Repetition Review** — Review saved chunks with SM-2 flashcards

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Charts:** Recharts
- **APIs:** Free Dictionary, Datamuse, LanguageTool, Web Speech API

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd FluentFive
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings → API** and copy your `Project URL` and `anon public key`
3. Go to **Settings → API → Service role key** (for server-side operations)

### 3. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Run Database Migration

Go to your Supabase project → **SQL Editor** and run:
1. `supabase/migrations/001_initial_schema.sql` (creates all tables + RLS policies)
2. `supabase/seed.sql` (inserts activities, sentences, passages, quiz questions)

### 5. Configure Auth (Optional)

For Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create an OAuth 2.0 client (Web application type)
3. Add `your-supabase-url/auth/v1/callback` as an authorized redirect URI
4. In Supabase Dashboard → **Auth → Providers → Google**, enable and paste your client ID/secret

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📦 Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add your environment variables in Vercel project settings
4. Deploy — done!

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Auth page
│   ├── auth/callback/route.ts # OAuth callback
│   └── app/
│       ├── page.tsx           # Dashboard
│       ├── shadow/page.tsx    # Activity 1
│       ├── speak/page.tsx     # Activity 2
│       ├── read/page.tsx      # Activity 3
│       ├── write/page.tsx     # Activity 4
│       ├── review/page.tsx    # Activity 5
│       ├── progress/page.tsx  # Progress charts
│       └── test/page.tsx      # Quiz system
├── components/
│   └── progress/
│       └── ProgressChart.tsx  # Interactive Recharts
├── lib/
│   ├── supabase/              # Client/server/middleware
│   ├── sm2.ts                 # Spaced repetition algorithm
│   ├── xp.ts                  # XP reward system
│   ├── streak.ts              # Streak logic
│   ├── chunk-quiz.ts          # Quiz generation
│   └── utils.ts               # Utility functions
└── middleware.ts               # Auth route protection
```

## 💰 Cost

**$0** — runs entirely on free tiers (Supabase, Vercel, all APIs).

## 📄 License

MIT

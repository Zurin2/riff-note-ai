# riff

A voice-first personal productivity app. You talk (or type) messily; riff turns the ramble into a
clean **note** (title + bullets) and pulls out **to-do items**, filed under **Work / School /
Personal / Other**, each with a priority. Everything is private to the signed-in account.

Rebuilt from the original Base44 app as **Next.js → Supabase → Vercel**.

## Stack

- **Next.js 16** (App Router, JavaScript) + React 19, Tailwind CSS v4 — warm-paper design tokens
  (Fraunces + Inter), no component library beyond two hand-rolled dialogs/boards.
- **Supabase** — Postgres + owner-only RLS (`user_id = auth.uid()`, no admin branch — deliberate),
  email/password auth via `@supabase/ssr`.
- **Gemini free tier** — the organizing brain. `POST /api/organize` is a server route that makes
  one stateless JSON-schema call per ramble. The API key never reaches the browser.
- **Web Speech API** — native browser transcription; no external speech service.

## Setup

```bash
npm install
cp .env.local .env.local   # then fill in real values (already generated; fill Supabase + Gemini keys)
```

`.env.local` needs:

| var | where from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key (free tier) |
| `GEMINI_MODEL` | optional, defaults to `gemini-3.5-flash-lite` (Google retired `gemini-2.5-flash-lite` for new users in Nov 2026) |

`.env.local` is git-ignored. GitHub → git push and GitHub → git commit are deliberate user actions only.

## Supabase project (one-time)

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. SQL Editor → paste **`supabase/schema.sql`** → Run. Creates `notes`, `tasks`, `messages`
   with owner-only RLS policies and helpful indexes.
3. Authentication → Providers → Email: enabled. Turn **email confirmation** OFF if you want
   instant sign-in after register (default ON sends a confirm email — the register page handles both).
4. Copy the URL + publishable key (Supabase's new name for the anon key) into `.env.local`,
   and later into Vercel env vars. Never use the `sb_secret_…` key in this app — it bypasses RLS.

## Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production check
npm run lint
```

## Data model

Three owner-scoped tables (schema in `supabase/schema.sql`):

- **notes** — `title`, `bullets` (jsonb array), `source_text`, `task_count`
- **tasks** — `title`, `done`, `priority` (`high`/`normal`), `category`
  (`work`/`school`/`personal`/`other`), `note_id`, `due_hint`
- **messages** — chat bookkeeping: `role` (`user`/`assistant`), `content`, `note_id`
  (pointer to the resulting note)

Ownership is stamped automatically by a column default (`auth.uid()`); RLS enforces every
read/update/delete against the same rule with **no admin bypass**.

## Deploy to Vercel

1. Push this repo to GitHub (deliberate action — not automatic).
2. [vercel.com](https://vercel.com) → Add New → Project → import the repo.
3. Framework preset: Next.js (auto). Add the four env vars from `.env.local` for
   *Production* (+ Preview). Deploy.
4. Add your Vercel domain to Supabase → Authentication → URL Configuration → Site URL /
   Redirect URLs so password-reset emails redirect correctly.
5. Voice input requires HTTPS + Chrome/Edge/Safari with mic permission — production on Vercel
   is HTTPS by default; Firefox falls back to typing (expected).

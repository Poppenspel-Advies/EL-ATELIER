# EL ATELIER

**A private maison of couture intelligence.** EL ATELIER is a digital atelier where a client's vision is transformed into haute couture — a deep-sea-inspired creative studio that composes design briefs and renders fashion illustrations through AI.

## Features

- **Home** — Immersive deep-blue sea hero with a live ocean video backdrop, animated wave layers, and the maison's manifesto.
- **Studio** — The heart of the atelier. Describe a garment vision, and *Pensamiento* composes a complete couture design brief (name, silhouette, fabric, palette, occasion, mood, styling notes), then *COUTURE VISION* renders a full-length fashion illustration.
- **Archive** — Browse saved designs from previous sessions.
- **Dossier** — Personal profile and saved works, tied to your account.
- **Auth** — Email/password sign-up and sign-in powered by Supabase Auth, with protected routes.

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 18 + TypeScript |
| Build / Dev server | Vite 7 |
| Styling | Tailwind CSS v4 |
| Routing | React Router 7 |
| Backend | Supabase (Auth + Edge Functions) |
| AI | OpenAI (via a Supabase Edge Function — no keys in the browser) |

## Prerequisites

- **Node.js 20+** and **npm**
- A **Supabase project** (hosted) with:
  - Auth enabled (email/password)
  - The `generate-design` Edge Function deployed
  - An `OPENAI_API_KEY` secret stored on the Edge Function

## Setup & Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

The app reads two public Supabase values at runtime:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your project's publishable anon key

> Only variables prefixed with `VITE_` are exposed to the browser. These two values are **public by design** (URL + anon key) and safe to embed.

**Option A — Environment settings (recommended on the NativelyAI platform):** add both keys in the project's **Environment settings** panel under their exact `VITE_` names.

**Option B — Local-only workflow:** create a `.env.local` file in the project root (it is git-ignored):

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

You can find both values in the Supabase dashboard under **Project Settings → API**.

The app throws a clear error on startup if either value is missing — it will not silently run misconfigured.

### 3. Configure the OpenAI secret (server-side only)

The OpenAI API key is **never** shipped to the browser. It is stored as a Supabase Edge Function secret and read only inside `supabase/functions/generate-design/index.ts` via `Deno.env.get("OPENAI_API_KEY")`.

- Supabase dashboard → your project → **Edge Functions** → **Secrets**
- Add `OPENAI_API_KEY` with your key value

> If the atelier returns *"The atelier key is not configured"*, this secret is missing.

### 4. Run the dev server

```bash
npm run dev
```

Open the printed local URL (default `http://localhost:5173`) to enter the atelier.

### 5. Production build

```bash
npm run build      # type-safe production build into dist/
npm run preview    # serve the built app locally to verify
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Build the production bundle |
| `npm run preview` | Locally preview the production build |
| `npx tsc --noEmit` | Type-check the project without emitting |

## Project Structure

```
├── index.html                  # App entry HTML
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Routes & app shell
│   ├── index.css               # Tailwind v4 theme + design tokens
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── auth.tsx            # Auth context & hooks
│   │   ├── api.ts              # Edge Function client
│   │   └── types.ts            # Shared types
│   ├── components/             # Logo, Navbar, Footer, ProtectedRoute, VideoBackdrop
│   └── pages/                  # Home, AuthPage, Studio, Archive, Dossier
└── supabase/
    └── functions/
        └── generate-design/    # Edge Function: brief composition + illustration
```

## Notes

- Design language is defined in `docs/design-system/MASTER.md` (palette, typography, and anti-patterns) — keep new UI consistent with it.
- Auth uses the implicit flow so sign-in works across ephemeral preview URLs.
- Respect `prefers-reduced-motion` when adding animation; the video backdrop already falls back to a static CSS sea.

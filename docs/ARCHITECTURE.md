# BandsChamber Studio — Architecture

## 1. Stack & runtime

- **Next.js 16** (App Router, React 19), TypeScript, Tailwind CSS v4
- **Auth**: **Better Auth 1.7** (`src/lib/auth.ts`, Kysely `LibsqlDialect`,
  handler at `src/app/api/auth/[...all]/route.ts`); email + password with a
  custom scrypt hash/verify so legacy `app_user` hashes keep working;
  server-side session lookup via `getSession`, 30-day cookie
  `better-auth.session_token`; email verification required; single-use
  verify/reset tokens enforced by the `app_email_token` ledger. Signing secret
  from `BETTER_AUTH_SECRET` (falls back to `AUTH_SECRET`, then a dev default);
  base URL from `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL` or `BETTER_AUTH_URL`.
  Optional **Better Auth Infrastructure dashboard**: `dash()`
  (`@better-auth/infra` 0.4.x) is enabled only when `BETTER_AUTH_API_KEY` is
  set; it mounts admin endpoints under `/api/auth/dash/*`, each gated by a
  dashboard-signed JWT whose API-key hash must match.
- **Auth + app data**: single shared **Turso/libSQL** database
  (`MUSIC_TURSO_DATABASE_URL` / `MUSIC_TURSO_AUTH_TOKEN`);
  `next.config.ts` lists `@libsql/client`, `@libsql/kysely-libsql`, `kysely`,
  and `libsql` in `serverExternalPackages` so the native driver stays out of
  the webpack bundle
- **UI**: HeroUI components, Framer Motion, lucide-react icons, `sonner` toasts;
  **liquid glass** refraction layer via `@samasante/liquid-glass`
  (`src/components/ui/glass-surface.tsx` → `<GlassSurface>`, site-tuned optics)
  layered on top of the existing CSS glassmorphism utility classes
  (`.panel`, `.glass-pill`, `.glass-card-soft`, `.glass-shine`), which stay the
  cross-browser base/fallback (live-DOM bending is Chrome/Edge-only)
- **Audio**: raw Web Audio (synth voices, Karplus-Strong plucks, metronome,
  MIDI scheduler) + optional real-sample engine (`src/lib/music/sample-engine.ts`,
  files under `public/samples/`, CDN via `NEXT_PUBLIC_SAMPLE_BASE_URL`)
- **AI prompts**: local Ollama (`OLLAMA_BASE_URL`, default `llama3.1:8b`)
- **Email**: Resend (`src/lib/email.ts`) with fallback-URL surfacing when paused
- **PWA**: `@ducanh2912/next-pwa` (disabled in dev), manifest shortcuts,
  offline pill, install prompt
- **Tests**: Vitest, pure music-theory/sample libs only (`*.test.ts`)

No `middleware.ts` — auth and access are enforced **per page and per API
route**. Any new route must do the same (see §5).

## 2. Hubs & routes

| Route | What renders | Gate |
|---|---|---|
| `/` | Music Toolkit hub (Harmony tab + Progressions section below, lazy `dynamic(ssr:false)`) | login; **free Harmony fallback** when zero tabs granted |
| `/music-toolkit`, `/theory-lab`, `/progressions`, `/musician-helpers` | Redirect aliases to `/` | login |
| `/production-studio?tab=notation\|audio\|lyrics` (+ `song`) | Studio hub shell + song catalog + studio modal | login + ≥1 studio tab |
| `/tab-studio`, `/daw`, `/lyrics-library`, `/song-studio` | Redirect aliases to `/production-studio?tab=…` | login |
| `/prompt-library` | Prompt templates + runner (full-width library, top-right Create Prompt modal editor, color-enriched details modal) | login + `prompt-library` pageKey |
| `/membership` | Plans, PayPal checkout, history | login |
| `/account` | Profile, security, membership, access (admin tab) | login |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth flows | logged-in users redirect to `/` |

## 3. Data model (one Turso DB, tables auto-created + `ensureColumn` migrations)

**Auth** (`src/lib/auth.ts`): Better Auth tables `user` (name/email,
`emailVerified`, `emailVerifiedAt`, `isAdmin`), `session` (30-day, `httpOnly`
cookie `better-auth.session_token`), `account` (credential provider; scrypt
`salt:hash` password), `verification` (Better Auth reset-token material); plus
app tables `app_email_token` (confirmation 24 h / reset 30 min, sha256,
single-use ledger because Better Auth tokens are signed JWTs), `app_page_access`
(`(user_id, page_key)`), `app_email_change` (pending new-email confirmations).
Legacy `app_user`/`app_session` rows are copied into `user`/`account` on cold
start (`migrateLegacyAuthData`, idempotent) and can also be migrated with
`npm run migrate:better-auth`; `scripts/add-user.mjs` and
`scripts/set-password.mjs` write the Better Auth tables directly.

**Music** (`src/lib/music/db.ts`): `songs` (+ `user_id`, `project_slug`, full
metadata), `song_sections` / `song_layers` (name/text/JSON per song),
`song_partitures` (instrument × slot × format), `music_task_template`
(prompt templates), `projects` + `project_members` (owner/editor/viewer).

**Membership** (`src/lib/membership.ts`): `membership_plans` (seeded Free /
Pro $9.99 mo / Lifetime $149), `membership_subscriptions`
(pending/active/cancelled/expired/past_due), `membership_payments`
(created/captured/failed/refunded).

## 4. Roles & access

- `isAdmin` flag **or** bootstrap email (`BOOTSTRAP_ADMIN_EMAILS`) ⇒ admin
  (full page map, immutable in UI). An active paid membership
  (`hasActivePaidMembership`) also unlocks every page key; free plans and
  lapsed subscriptions fall back to explicit grants.
- 9 manageable page keys in `src/lib/access.ts`, grouped into Production
  Studio / Music Toolkit / Prompt Library hubs (`HUB_ACCESS_GROUPS`).
- Toolkit tabs map to pageKeys: harmony→`theory-lab`, tuner→`musician-helpers`
  (tuner is embedded inside the Harmony tab; `?tab=tuner` redirects to harmony).
  Progressions is no longer a tab — it renders directly on the home page below
  the Harmony tab area. `/?tab=harmony` is surfaced as a compact navbar link —
  no tab bar is rendered inside the page. The top navbar is sticky at `top-0`
  with compact icon-only controls (language, account, theme). Fullscreen toggle
  lives next to the page title (h1 row).
- Harmony tab contains: "Scales & Keyboard" section (piano + fretboard + scale
  explorer) and "Chords" section (constructor with How-to-Play, per-instrument
  Play chord, follows selected inversion). Titles simplified for brevity.
  Tuner and Metronome have been removed from the Harmony tab (2026-11-21).
- Progressions renders on the home page below the tabbed area: "Progressions"
  card (timeline + playback) and "Presets" card (library) — no Chord Voicing
  Preview. Titles simplified for brevity.
- **UI/UX** (2026-11-21): AppShell page titles display contextual icons
  (Music/Music2/WandSparkles) and stack vertically on mobile. CollapsibleCard
  headers use responsive padding, 44px minimum touch targets, and proper
  chevron button with ARIA labels. All interactive controls maintain WCAG
  2.5.5 touch target minimums. Global CSS includes safe area insets for
  notched devices, reduced motion support, and high contrast mode support.
- Server: `requireCurrentUser()` → `/login`; `AppShell({pageKey})` → denied
  redirect; API: `requireApiUser` (401) / `requireAdminApiUser` (403).
- Known scoping quirk (see REQUIREMENTS NFR/security notes): any song with a
  non-empty `project_slug` is readable by every logged-in user; comments live
  only in per-user localStorage.

## 5. Key flows

- **Register → verify → login**: Better Auth `signUpEmail` (8-char min,
  duplicate reject) → verification JWT email (or fallback URL) → verified gate
  at login → 30-day session. Auth pages run their own server session check and
  redirect logged-in users to `/`; `src/proxy.ts` only enforces "login
  required" for non-public paths and no longer redirects auth pages from a
  cookie, so a stale/revoked cookie can't bounce visitors between `/login` and
  `/`.
- **Password/email self-service**: verify/reset links are claimed once in
  `app_email_token` before Better Auth consumes the JWT; logged-in password
  change (current-password gated, rotates other sessions); email change
  confirms via link to the **new** address (`/account?email-change=`);
  logged-out change via email + current password (`/api/auth/change-password`).
- **Songs**: catalog (owned + project-shared) → detail → sections/layers/
  partitures → modal tabs (lyrics / DAW / notation) → band assignment.
  The Songs Library sidebar groups songs by band, sorts band/song names
  alphabetically, and offers an all-bands or single-band filter (including
  Solo). The band filter persists per user, and collapsed song entries use
  the band color and accessible song/band labels. Song entries show the
  band/project badge in its band color; the navbar brand uses the PWA app icon.
- **DAW**: MIDI import → layers (gain/pan/mute/solo) → tempo-ratio playback →
  note edit/quantize → JSON manifest export.
- **Tabs**: fretboard grid ⇄ ASCII (`gridToAscii`/`parseAsciiTab`) ⇄ song
  partitures; step playback with loop/playhead.
- **Composition UX** (2026-11-21): catalog filter bar shows the number of
  active filters and matching results ("N of M songs") with a one-click
  clear-all; Notation/Partitures adds a persisted zoom control (60–250 %), a
  `Bar X · Beat Y · subdivision` playhead readout, and auto-follow scrolling;
  the Interactive Fretboard adds hover-play auditioning, root vs. in-scale vs.
  pressed emphasis, fret inlays, a last-played note/Hz readout, and
  horizontal scrolling on narrow screens.
- **Auth dashboard** (optional): create a project at
  `https://dash.better-auth.com`, copy its API key into
  `BETTER_AUTH_API_KEY`, and redeploy. The hosted dashboard reads users,
  sessions, analytics, and audit logs through the `dash()` endpoints; without
  a key the plugin is not registered and nothing changes.
- **Prompts**: template (song-field or part-scoped) → run on song via Ollama →
  preview → optional apply to the song field.
- **Membership**: free select (instant) → one-time order/capture → subscription
  create/poll/cancel → webhook fetch-back sync → history.
- **Client persistence**: `usePersistentState` — first paint from legacy key,
  then per-user `mt:<userId>:<key>` with debounced writes
  (`src/lib/persist.ts`); drafts for tabs/lyrics/songs with restore banners.
- **i18n**: typed 5-locale dictionaries (`en/es/de/fr/ru`, English fallback),
  `LanguageProvider` persisted per user, `<html lang>` switch
  (`src/lib/i18n/*`).

## 6. Repo map (where things live)

- `src/app/` — pages + `api/` route handlers (account, music, membership);
  `src/app/api/auth/[...all]/route.ts` delegates the whole auth surface
  (sign-up/in/out, verify, reset) to Better Auth via `toNextJsHandler`
- `src/proxy.ts` — cookie-presence gate only (no DB, no auth-page redirects)
- `src/components/music/` — feature clients (toolkit, studio, daw, tabs…)
- `src/components/{auth,account,membership,pwa,ui}/` — cross-cutting UI
- `src/components/ui/glass-surface.tsx` — shared `<GlassSurface>` primitive
  (site-tuned `liquidGlassOptics`, `display:block` default) used by the shell,
  cards, sidebars, form fields, list rows, and modals; `globals.css` supplies
  the `--glass-rim*`/`--glass-dispersion` tokens and the `[data-lg-layer]`
  out-of-flow pin for the layers `<Glass>` injects
- `src/lib/` — `auth.ts`, `access.ts`, `hub-access.ts`, `api.ts`,
  `music/*` (domain libs), `i18n/*`, `persist.ts`, `membership*.ts`
- `src/lib/music/` domain libs:
  - **Core**: `notes.ts`, `pitch.ts`, `tunings.ts`, `tab-grid.ts`, `partitures.ts`,
    `progression-presets.ts` (42 presets across 9 categories), `midi-parser.ts`,
    `midi-playback.ts`, `metronome-sound.ts`, `instrument-synth.ts`, `keyboard-synth.ts`,
    `sample-engine.ts`
  - **Theory analysis** (2026-11-21): `roman-numeral.ts`, `mode-interchange.ts`,
    `cadence-detection.ts`, `chord-substitution.ts`, `scale-chord-compat.ts`,
    `key-signature.ts`, `rhythm-patterns.ts`, `chord-voicing.ts`,
    `voice-leading.ts` (parallel fifths/octaves, common tones, smoothness scoring),
    `chord-recognition.ts` (chord type/inversion from note sets),
    `modulation-detection.ts` (key change detection with pivot chords),
    `rhythm-analysis.ts` (time signature/BPM/swing auto-detection),
    `microtonal.ts` (10 microtonal scales with frequency calculation)
  - **Audio** (2026-11-21): `audio-effects.ts` (reverb/delay/compression/EQ/distortion
    chain with presets), `chord-articulation.ts` (7 strum patterns, 8 arpeggio styles)
  - **Export** (2026-11-21): `musicxml-export.ts` (MusicXML 3.1 generation),
    `abc-export.ts` (ABC notation for progressions/melodies),
    `shareable-links.ts` (base64url encoded progression URLs)
  - **AI** (2026-11-21): `ai-suggestions.ts` (Ollama-powered chord suggestions,
    rhyme dictionary, style transfer with fallbacks)
  - **Accessibility** (2026-11-21): `aria-roles.ts` (ARIA props for piano/fretboard/
    DAW/drum components)
  - **Types**: `types.ts` — `ScaleType` union (21 scales), `SCALE_TYPES` constant
- `src/components/music/` — feature clients (toolkit, studio, daw, tabs…) +
  **new components** (2026-11-21): `circle-of-fifths.tsx`, `practice-mode.tsx`,
  `drum-pattern-editor.tsx`, `bass-line-generator.tsx`, `melody-generator.tsx`,
  `progression-export.tsx`, `piano-roll-editor.tsx` (MIDI note creation with
  drag-and-drop), `chord-diagram.tsx` (SVG fretboard diagrams),
  `waveform-visualizer.tsx` (real-time audio waveform/spectrum),
  `song-timeline.tsx` (section arrangement visualization),
  `progression-timeline.tsx` (chord timeline with playhead),
  `song-stats.tsx` (library statistics dashboard),
  `practice-history.tsx` (session tracking with weekly stats)
- `src/components/ui/theme-toggle.tsx` — dark/light theme toggle with system
  preference detection
- `src/hooks/use-keyboard-shortcuts.ts` — global keyboard shortcuts hook
  (Space=play/stop, ←/→=prev/next, ⌘F=fullscreen, ⌘K=search)
- `src/hooks/use-pwa.ts`, `public/manifest.webmanifest`, `public/sw.js`
- `scripts/add-user.mjs`, `scripts/set-password.mjs` — admin DB ops against the
  Better Auth `user`/`account` tables; `scripts/migrate-auth-to-better-auth.mjs`
  (`npm run migrate:better-auth`) copies legacy auth rows on demand
- `docs/` — this documentation (source of truth for behavior)

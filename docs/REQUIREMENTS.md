# BandsChamber Studio — Requirements

> Numbered, testable requirements derived from the implemented code.
> `FR-*` = functional, `NFR-*` = non-functional. MVP = all of these,
> monetization **free-first** (PayPal present, live payments = Phase 2).

## Functional requirements

### Auth & account
- FR-001 Register rejects invalid email, `<8`-char passwords, and duplicate
  email; creates an unverified user and sends confirmation (or returns a
  fallback URL when delivery is paused).
- FR-002 Login fails generically on bad credentials and blocks unverified
  email with a confirm-email message.
- FR-003 Email-confirm tokens (24 h, single-use) verify the user via Better
  Auth's signed token plus the `app_email_token` sha256 ledger;
  invalid/consumed/expired tokens error.
- FR-004 Password-reset requests are enumeration-safe; reset tokens (30 min,
  single-use via the same ledger) set a `≥8`-char password and revoke all
  sessions.
- FR-005 Logged-in password change requires the current password and rotates
  all other sessions while keeping the current one.
- FR-006 Email change requires the password, rejects same/taken addresses,
  and swaps the login email only after new-address confirmation.
- FR-007 Logged-out password change (login screen) requires email + current
  password and rotates all sessions.
- FR-008 Better Auth sessions (`better-auth.session_token`) expire after 30
  days; logout deletes the server session, clears the cookie, and clears the
  legacy pre-migration session/cookie.
- FR-009 Admins list users (email/name/verified/admin + page map), rename
  non-admins, and set per-page access; admin rows are immutable in UI.
- FR-010 Bootstrap admin emails are always treated as admin.

### Access
- FR-011 Every page except auth requires login (`/login` redirect); gated
  pages redirect to `/account?denied=<key>` with an explanatory banner.
- FR-012 Root `/` always renders the Harmony tab for any logged-in user
  (free access + banner); disallowed `?tab=` normalizes to harmony.
- FR-013 Tab resolvers fall back to the first allowed tab for missing/invalid
  params; hub APIs reject unauthenticated (401) and non-admin (403) callers.

### Toolkit home
- ~~FR-014 Metronome plays accented clicks per time signature (2/4–12/8),
  subdivision, voice, volume, and count-in; BPM/tap-tempo persist per user.~~
  **Removed 2026-11-21**: Metronome removed from Harmony tab.
- ~~FR-015 Tuner captures mic audio, shows detected pitch + cents offset, and
  plays reference plucks across guitar/bass presets. Includes interactive
  fretboard grid with click-to-play and customizable tunings. **The Tuner is
  embedded at the top of the Harmony tab** (`/?tab=harmony`); `/?tab=tuner`
  redirects to harmony.~~ **Removed 2026-11-21**: Tuner removed from Harmony tab.
- FR-042 The toolkit navigation (harmony) is rendered as compact navbar links
  in the top sticky bar — no tab bar inside the page. Progressions renders
  directly on the home page below the Harmony tab area. The fullscreen toggle
  is rendered inline with the page title (h1 row). The navbar controls
  (language, account, theme) are icon-only compact.
- FR-016 Theory Lab renders 21 scales and 30 chord types with inversions
  and diatonic triads, and audibly plays scales/chords in the selected voice.
  Includes interactive fretboard grid with scale visualization overlays.
  Added scales: Whole Tone, Half Diminished, Japanese In, Japanese Yo,
  Hungarian Minor, Double Harmonic, Prometheus, Chromatic.
  Added chords: Major 6/9, Dominant 7 #9, Dominant 7 b9, Minor Maj7,
  Augmented 7, Major 11, Lydian Dominant, French Aug, Italian Aug,
  German Aug, Power, sus4 add9. (2026-11-21)
- FR-017 Piano responds to mouse, QWERTY rows (Z–M / Q–U, arrows shift
  octave), and WebMIDI note-on/off where supported.
- FR-018 Chord How-to-Play (inside Chord Constructor & Inversions) shows
  per-instrument voicing for the active chord and inversion, with a Play
  chord control on each instrument card (piano, guitar, ukulele, bass,
  drums, vocals) using that instrument’s voice. Includes interactive
  fretboard grid with chord/scale overlay modes.
- FR-019 Progressions builder supports add/remove, preset load, transpose,
  Roman-numeral + function analysis, playback, and export. It does **not**
  include a Chord Voicing Preview section (that lives on Harmony).
- FR-041 Harmony Chord Constructor Play-chord uses the selected inversion’s
  bass (lowest stacked tone) so first/second inversion playback matches
  the constructor, not only root position.

### Production studio
- FR-020 Song catalog lists owned + project-shared songs with counts,
  search, genre/key/emotion/mood/project/instrument filters, and saved
  presets. The filter bar shows the number of active filters and the matching
  result count ("N of M songs") and offers one-click clear-all, including from
  the empty state. The Studio Songs Library sidebar groups songs by band and
  provides an all-bands or single-band filter, including unassigned Solo songs;
  the selection persists per user and collapsed entries identify each song's
  band.
- FR-021 Song CRUD plus section/layer part upsert/delete persist and reload
  correctly.
- FR-022 Band CRUD (slug/color/shared flag/members) works; member songs
  appear in the catalog with accurate per-project counts.
- FR-023 Lyrics editor saves lyrics + structure per song, shows
  lines/words/syllables/est-duration, and restores per-user drafts.
- FR-024 Song Studio persists all metadata fields plus per-instrument
  partitures (auto slot, 5 formats) via API.
- FR-025 Notation & Audio Studio integrates tab notation and DAW in a unified
  interface with split-view, view-mode toggles (split/tab/DAW), and
  sync direction (MIDI-to-tab, tab-to-MIDI). Imports MIDI with comprehensive
  file upload buttons for MIDI, audio, and session files.
- FR-026 Tab Studio grid edits generate valid ASCII tab; ASCII paste parses
  back; tuning switches preserve string mapping; playback steps with
  loop + playhead jumps. The grid supports a persisted zoom control (60–250 %),
  a `Bar · Beat · subdivision` playhead readout, and auto-follow scrolling
  that keeps the playhead in view. Includes interactive fretboard grid with
  click-to-play, scale overlays, and customizable tunings.
- FR-027 Studio modal opens any allowed tab for the selected song with
  split-view, pinned tabs, fullscreen, and exit-save confirmation.
- FR-028 Song comments create/delete per user in localStorage namespaced per
  user.

### Prompts
- FR-029 Templates validate (name, instructions, valid song-field or ≥1 part
  kind) and are strictly per-user.
- FR-030 Prompt runs require `prompt-library` + `song-studio` access, call
  Ollama, return `{output,targetLabel,applied}`, and apply writes only to the
  template's song-field.

### Membership & PayPal
- FR-031 Plans endpoint lists only active plans in order; config endpoint
  reports PayPal mode/configured state.
- FR-032 Free plan selection activates instantly; paid plans via `select`
  are rejected.
- FR-033 One-time checkout creates → captures the order, activates the
  subscription, and records payment idempotently by order id.
- FR-034 Recurring flow creates the billing plan once, creates a pending
  subscription, and status-poll transitions it to `active` with period dates.
- FR-035 Cancel marks the subscription `cancelled` even if remote PayPal
  cancel fails (warning logged).
- FR-036 Webhook fetch-back verification syncs subscription/payment states
  for captures, activations, cancellations, and payment failures.

### PWA, i18n, persistence, shell
- FR-037 App installs (native prompt + iOS guide), runs standalone from `/`,
  serves cached shell offline with a visible offline pill.
- FR-038 All UI chrome strings resolve in 5 locales with English fallback;
  locale persists per user.
- FR-039 Per-user `mt:<userId>:<key>` state migrates legacy keys once and
  stays namespaced across users on one browser.
- FR-040 Footer always shows tagline, PayPal note, Studio/Account links,
  © year, and Go Pro CTA.
- FR-043 Every content surface (navbar, footer, page panels, dashboard and
  collapsible cards, sidebars, form fields, list/table rows, and modals) renders
  a liquid-glass refraction layer via the shared `<GlassSurface>` primitive
  (`@samasante/liquid-glass`), layered on top of the existing CSS glassmorphism
  classes (`.panel`, `.glass-pill`, `.glass-card-soft`, `.glass-shine`), which
  remain the base in every browser. Live-DOM refraction is Chrome/Edge-only;
  Safari/Firefox still frost, tint, and edge-light.

### Music theory analysis (2026-11-21)
- FR-044 Roman numeral analysis generates scale-degree labels for any chord
  progression in any key and scale type, including borrowed chord detection.
- FR-045 Mode interchange detection identifies borrowed chords from parallel
  modes and reports the source mode for each non-diatonic chord.
- FR-046 Cadence detection identifies Authentic (V-I), Plagal (IV-I), Half (V),
  Deceptive (V-vi), Backdoor (bVII-bIII), Ritardando (IV-VI), Imperfect, and
  Phrygian Half (bII-I) cadences in progressions.
- FR-047 Chord substitution suggestions provide tritone substitution, major/minor
  swap, extension additions, diatonic substitution, and rootless voicing options.
- FR-048 Scale/chord compatibility checker maps which scales work over which
  chord types (Perfect/Good/Okay/Avoid ratings) and generates diatonic chords
  for any scale in any key.
- FR-049 Key signature display shows sharps/flats for all 12 major and minor
  keys, relative keys, and closely related keys for modulation reference.
- FR-050 Rhythm pattern library provides 12 preset patterns across 8 categories
  (Straight/Swing/Shuffle/Latin/Jazz/Rock/Electronic/Folk) with accent and
  subdivision data for metronome integration.
- FR-051 Chord voicing suggestions generate Close/Open/Rootless/Drop 2/Drop 3/
  Shell/Cluster voicings for any chord, with instrument-specific recommendations.

### Interactive tools (2026-11-21)
- FR-052 Circle of Fifths visualization renders an interactive SVG circle showing
  all 12 major keys with sharps/flats, relative minors, closely related keys,
  and diatonic chords. Clicking a key highlights its relationships.
- FR-053 Practice Mode provides scale recognition, chord recognition, and scale
  play ear training with random challenges, audio playback, answer checking,
  accuracy stats, and streak tracking.
- FR-054 Drum Pattern Editor provides a 16-step sequencer grid with 6 drum sounds
  (Kick/Snare/Hi-Hat/Clap/Tom/Crash), preset loading from rhythm patterns,
  playback, and MIDI export.
- FR-055 Bass Line Generator creates bass lines from chord progressions in 4
  styles (Root-Fifth/Walking/Syncopated/Chromatic) with playback and text export.
- FR-056 Melody Generator creates melodies from selected scales in 4 styles
  (Pentatonic/Blues/Jazz/Random) with configurable bars, playback, and text export.
- FR-057 Progression Export exports chord progressions as MIDI files (with chord
  notes on channel 1) or plain text chord charts.
- FR-058 Keyboard shortcuts hook registers global shortcuts: Space=play/stop,
  ←/→=previous/next, ⌘F=fullscreen, ⌘K=global search. Skips input/textarea
  fields to avoid conflicts.

### Music theory analysis extended (2026-11-21)
- FR-059 Voice leading analysis detects parallel fifths/octaves, common tones,
  smooth vs. leap motion between consecutive chords, and suggests improvements.
- FR-060 Chord recognition from note sets determines chord type and inversion
  from MIDI notes or pitch classes with confidence scoring.
- FR-061 Modulation detection identifies key changes within progressions,
  finds pivot chords, and suggests smooth modulation paths via circle of fifths.
- FR-062 Rhythm analysis detects time signature, BPM, beat subdivision, and
  swing/shuffle feel from note-on/note-off event sequences.
- FR-063 Extended progression presets add 12 presets across 4 new categories:
  K-Pop & J-Pop (3), R&B & Soul (3), Film Scores (3), Metal & Hard Rock (3).
- FR-064 Microtonal support provides 10 microtonal scales (quarter-tone,
  Middle Eastern Maqam, Indian Shruti, Just/Pythagorean, Turkish, etc.) with
  frequency calculation and scale generation.

### Audio engine extended (2026-11-21)
- FR-065 Audio effects processing chain applies Reverb (convolution), Delay
  (tempo-synced with feedback), Compression (lookahead), EQ (3-band parametric),
  and Distortion (softclip/tube/fuzz/overdrive) with wet/dry mix and presets.
- FR-066 Chord strumming and arpeggiation adds 7 strum patterns (Down, Down-Up,
  Island, Folk, Rock, Bossa Nova, Percussive) and 8 arpeggio styles (Broken,
  Alberti, Ascending, Descending, Waltz, Classical, Jazz, Travis Pick).

### UI components extended (2026-11-21)
- FR-067 Piano Roll Editor provides visual MIDI note creation with drag-and-drop,
  grid snapping, playback with playhead, and note list management.
- FR-068 Chord Diagram Generator renders SVG fretboard diagrams showing finger
  positions for any chord type/inversion with hover tooltips.
- FR-069 Waveform Visualizer displays real-time audio waveform and frequency
  spectrum from MediaStream input using canvas rendering.
- FR-070 Song Structure Timeline visualizes song sections (Intro/Verse/Chorus/
  Bridge/Outro) with color coding, duration, and clickable section details.
- FR-071 Dark/Light Theme Toggle detects system preference (prefers-color-scheme),
  persists selection per user, and switches data-theme attribute.
- FR-072 Mobile Responsive Layouts add CSS utilities for stacking, touch targets,
  scrollable timelines, and tablet grid adjustments.
- FR-073 Progression Timeline Visualization shows chord durations, measure
  boundaries, auto-scrolling playhead, and active chord highlighting.

### Data & Analytics (2026-11-21)
- FR-074 Song Statistics Dashboard shows total songs, avg BPM, most used keys,
  genre distribution, and most active bands with bar charts.
- FR-075 Practice Session Tracking logs sessions (date, duration, type, accuracy),
  shows weekly stats, and provides usePracticeTracking hook.

### Export formats (2026-11-21)
- FR-076 MusicXML Export generates valid MusicXML 3.1 from note sequences with
  key/time signature, tempo, and download support.
- FR-077 ABC Notation Export converts progressions and melodies to ABC format
  with harmony lines and download support.
- FR-078 Shareable Progression Links encode progressions as base64url query params
  for read-only sharing without login.

### AI features (2026-11-21)
- FR-079 AI Chord Progression Suggestions use Ollama to suggest progressions
  by genre/mood/key with fallback suggestions when offline.
- FR-080 AI Lyrics Rhyme Dictionary queries Ollama for perfect/near/multi-syllable
  rhymes for any word.
- FR-081 AI Style Transfer converts progressions to different genres via Ollama
  with chord quality and explanation.

### Accessibility (2026-11-21)
- FR-082 ARIA roles for music components provide proper roles (group/grid/log/
  gridcell) and labels for piano, fretboard, DAW timeline, drum sequencer,
  and progression list.

### UI/UX enhancements (2026-11-21)
- FR-083 AppShell page title row displays a contextual icon (Music/Studio/
  WandSparkles) for each page, stacks eyebrow and title vertically on mobile,
  and clamps description to one line on small screens.
- FR-084 CollapsibleCard headers use responsive padding (px-3/px-5), smaller
  icons on mobile (h-8/h-9), responsive text sizes, and a proper button element
  for the chevron toggle with ARIA labels. Minimum header height is 44px for
  touch targets.
- FR-085 Theory Lab uses simplified titles ("Scales & Keyboard", "Chords",
  "Explore", "Build"), icon-only mode toggle buttons on mobile (Music/Layers
  icons), responsive controls layout (stacked on mobile), and scrollable
  piano/fretboard containers for mobile overflow.
- FR-086 Progression client uses simplified titles ("Progressions", "Presets",
  "Build", "Library"), responsive playback settings (stacked on mobile),
  icon-only Play/Export/Loop buttons on mobile, smaller chord tiles on mobile
  (h-20/h-28, w-[3.5rem]/w-[4.5rem]), and proper touch targets (min-h-[32px]/
  min-h-[44px]).
- FR-087 Global CSS includes mobile-first utilities: safe area insets for
  notched devices, reduced motion support (prefers-reduced-motion), high
  contrast mode support (prefers-contrast), horizontal overflow prevention,
  and WCAG 2.5.5 touch-friendly minimum targets.
- FR-088 All interactive buttons and controls maintain minimum 44px touch
  targets on mobile per WCAG guidelines, with responsive text sizing and
  spacing that adapts at sm (640px) breakpoint.

### Composition UX & auth migration (2026-11-21)
- FR-089 Interactive Fretboard supports click-to-play and hover-play
  auditioning (a Hover Play toggle, or forced on by the host view), emphasizes
  the root and in-scale frets with a legend, shows standard inlays at frets
  3/5/7/9 and a double inlay at 12, labels frets 1–12 (open-string fret 0 is
  the separate open-string row), reports the last played note/octave/Hz/
  string/fret with in-scale status, and scrolls horizontally with a 560 px
  minimum width on narrow screens.
- FR-090 Better Auth migration: existing `app_user` identities (ids, scrypt
  hashes, verification timestamps, admin flag) are copied into
  `user`/`account` automatically on cold start and can be re-run with
  `npm run migrate:better-auth`; page access, membership, and song ownership
  keep the same user ids, and admin bootstrap emails still map to `isAdmin`.

## Non-functional requirements

- NFR-001 **Performance**: lazy tab loads (`dynamic(ssr:false)`); PWA
  precache + NetworkFirst/CacheFirst splits; localStorage writes debounced
  ~600 ms; no full-list pagination (acceptable at current scale).
- NFR-002 **Security**: Better Auth session handling with scrypt +
  `timingSafeEqual` password hashing (legacy hashes preserved), hashed
  single-use email tokens, `httpOnly`/`SameSite=Lax`/prod-`Secure` cookies,
  parameterized queries, PayPal secret server-side only. Gaps to harden:
  Better Auth rate limiting (currently disabled), lockout, CSP headers
  (report-only today), webhook signature verification.
- NFR-003 **Privacy**: per-user storage namespaces; song ownership + project
  scoping; email-change double opt-in. Known breadth: any non-empty
  `project_slug` song is readable by all logged-in users.
- NFR-004 **Reliability**: best-effort drafts (storage-full tolerated); PWA
  offline shell; tolerant PayPal cancel; email fallback links. Ollama is a
  hard local dependency with no queue/retry.
- NFR-005 **Accessibility**: semantic landmarks, labeled controls, modal
  patterns via HeroUI. Gaps: piano/fretboard/DAW-timeline ARIA roles and a
  contrast/keyboard audit.
- NFR-006 **i18n**: typed dictionary keys across 5 locales; server emails
  remain English-only (accepted).
- NFR-007 **Maintainability**: schema auto-migrate (`CREATE TABLE IF NOT
  EXISTS` + `ensureColumn`); typed domain libs; Vitest on pure libs.
  Gaps: no e2e, no API/DB tests, gating duplicated per route (no middleware).
- NFR-008 **Progressive enhancement (liquid glass)**: the refraction layer is
  additive — the CSS glass classes provide the tint/rim/frost fallback in all
  browsers and never depend on the JS layer; the layers `<Glass>` injects are
  pinned out of flow (`[data-lg-layer]`) so they cause no layout shift; wrapping
  is applied to containers, not to native controls, to protect focus order and
  keyboard semantics.

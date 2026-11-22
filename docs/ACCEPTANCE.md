# BandsChamber Studio — Acceptance Criteria & MVP

## Acceptance criteria per area

- **Toolkit**: fresh login with zero grants sees Harmony + free banner;
  theory/progressions/piano (+QWERTY/MIDI) all sound and persist prefs across
  reload. The Interactive Fretboard labels frets 1–12 with inlays, plays on
  click or hover after enabling Hover Play, highlights the root vs. in-scale
  frets, shows the last-played note/Hz/string/fret, and scrolls horizontally
  on phones. Progressions renders directly on the home page below the Harmony tab
  area. Navbar shows compact harmony link; fullscreen button is next to the page
  title; navbar controls are icon-only. Chord Constructor How-to-Play Play chord
  sounds per instrument and follows inversion; Progressions has no Chord Voicing
  Preview section. Metronome and Tuner removed from Harmony tab (2026-11-21).
  (FR-012, FR-016–FR-019, FR-041, FR-042)
- **Music theory analysis** (2026-11-21): Roman numeral analysis labels any
  progression in any key/scale; mode interchange detects borrowed chords with
  source mode; cadence detection finds Authentic/Plagal/Half/Deceptive/Backdoor/
  Ritardando/Imperfect/Phrygian Half patterns; chord substitution suggests
  tritone/major-minor swap/extensions/diatonic/rootless options; scale/chord
  compatibility maps Perfect/Good/Okay/Avoid ratings; key signatures show all
  12 major/minor keys with relative and closely related keys; rhythm pattern
  library provides 12 presets across 8 categories; chord voicing generates
  Close/Open/Rootless/Drop 2/Drop 3/Shell/Cluster options. (FR-044–FR-051)
- **Interactive tools** (2026-11-21): Circle of Fifths renders interactive SVG
  with key details and related keys; Practice Mode provides ear training with
  stats and streaks; Drum Pattern Editor offers 16-step sequencer with MIDI
  export; Bass Line Generator creates lines in 4 styles; Melody Generator
  creates melodies in 4 styles; Progression Export downloads MIDI or text;
  keyboard shortcuts (Space/←/→/⌘F/⌘K) work globally. (FR-052–FR-058)
- **Music theory extended** (2026-11-21): Voice leading analysis detects parallel
  fifths/octaves and suggests improvements; chord recognition identifies chords
  from note sets; modulation detection finds key changes with pivot chords;
  rhythm analysis auto-detects time signature/BPM/swing; 12 extended progression
  presets in K-Pop/J-Pop/R&B/Film/Metal categories; 10 microtonal scales with
  frequency calculation. (FR-059–FR-064)
- **Audio engine extended** (2026-11-21): Effects chain applies reverb/delay/
  compression/EQ/distortion with presets; chord strumming provides 7 patterns
  and 8 arpeggio styles. (FR-065–FR-066)
- **UI extended** (2026-11-21): Piano Roll Editor for MIDI note creation;
  Chord Diagram Generator for fretboard visualization; Waveform Visualizer
  for real-time audio; Song Structure Timeline for arrangement; Theme Toggle
  with system preference detection; Mobile Responsive CSS utilities;
  Progression Timeline with playhead. (FR-067–FR-073)
- **Data & Analytics** (2026-11-21): Song Statistics Dashboard shows keys/
  genres/bands distribution; Practice Session Tracking logs and displays
  weekly stats. (FR-074–FR-075)
- **Export formats** (2026-11-21): MusicXML export for notation software;
  ABC notation export; shareable progression links via URL encoding.
  (FR-076–FR-078)
- **AI features** (2026-11-21): AI chord progression suggestions via Ollama
  with fallback; AI rhyme dictionary; AI style transfer for progressions.
  (FR-079–FR-081)
- **Accessibility** (2026-11-21): ARIA roles for piano/fretboard/DAW/drum
  components with proper labels and keyboard navigation. (FR-082)
- **UI/UX enhancements** (2026-11-21): AppShell displays page icons and
  responsive title layout; CollapsibleCard uses mobile-friendly padding,
  touch targets (44px min), and proper chevron button with ARIA labels;
  Theory Lab uses simplified titles ("Scales & Keyboard", "Chords"),
  icon-only mode toggles on mobile, and scrollable piano/fretboard;
  Progression client uses simplified titles ("Progressions", "Presets"),
  responsive playback settings, icon-only buttons on mobile, and smaller
  chord tiles. Global CSS includes safe area insets, reduced motion support,
  high contrast mode, and horizontal overflow prevention. (FR-083–FR-088)
- **Studio**: create song → edit lyrics/metadata/sections/layers/partitures
  → Songs Library groups entries by band, sorts groups/song titles, and its
  filter shows all bands, one band, or Solo and persists per user; collapsed
  entries identify their band by color and accessible label → catalog filters
  find it (active-filter and result counts shown, clear-all works) → modal
  tabs open → DAW import/play/export → grid↔ASCII round-trip (grid zoom and
  playhead bar/beat readout work) → band assign → collaborator sees the
  shared song. (FR-020–FR-028, FR-089)
- **Prompts**: create template → run on song via Ollama → preview output →
  apply writes the correct field; denied without both page grants.
  (FR-029–FR-030)
- **Membership**: free select works with PayPal unconfigured; with sandbox
  creds, lifetime order + monthly subscription + cancel + history reconcile;
  webhook updates survive restart. (FR-031–FR-036)
- **Account/Auth**: full register → verify → login → forgot → reset →
  change-password → change-email → logout cycle passes on Better Auth
  (`better-auth.session_token`, single-use verify/reset ledger); legacy
  `app_user` rows are migrated with the same ids so access, membership, and
  songs stay attached; admin toggles propagate within a refresh; denied links
  land on `/account?denied=`. (FR-001–FR-011, FR-090)
- **PWA/i18n**: installable from a production build; offline reload shows
  pill + shell; locale switch translates chrome + music strings and persists
  per user; footer links/CTAs resolve. (FR-037–FR-040)
- **UI / glass**: navbar, footer, page panels, dashboard & collapsible cards,
  sidebars, form fields, list rows, and modals all show the liquid-glass
  refraction layer over the existing glass CSS; on Safari/Firefox surfaces
  still frost/tint/edge-light (no live-DOM bend); the injected layers cause no
  layout shift and focus order stays intact. (FR-043, NFR-008)
- **Motion & observability** (2026-11-22): navigating between routes fades/
  lifts the page content once per path change (studio tab query changes do
  not replay it); reduced-motion users see instant swaps; Vercel Web
  Analytics is enabled and `<Analytics />` mounts; production requests appear
  in Vercel Traces at 10 % sampling with `bandschamber-studio` spans.
  (FR-091, NFR-009)

## MVP definition (agreed)

**MVP = all currently implemented features, monetization free-first.**

MVP is done when every FR-001–FR-090 passes with:

1. PayPal **sandbox or unconfigured** (paid buttons degrade gracefully to
   "not configured"); live payments are Phase 2.
2. Ollama **optional** — prompt-run failure must never break song CRUD.
3. Production-build PWA installable; 5-locale chrome complete; no
   console-blocking errors; per-user drafts intact across sessions.

## Phase 2 (explicitly out of MVP)

Live PayPal verification + webhook signature hardening + plan-gating
enforcement (plans display but don't gate features yet); shared (DB-backed)
comments; **DAW audio recording** (microphone input, waveform editing, live
audio tracks alongside MIDI); rhyme suggestions; API/DB/e2e test coverage;
central auth middleware; collaborator-endpoint scoping; song-visibility
tightening; accessibility audit (contrast/keyboard navigation for all
interactive elements).

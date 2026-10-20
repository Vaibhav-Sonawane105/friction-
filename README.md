# Progressive Friction — Website Blocker

A Chrome extension designed to interrupt mindless browsing habits by introducing intentional friction before accessing self-restricted websites. Production currently uses legacy arithmetic; a separate development build implements the modular foundation, Levels 1–2 and standalone Level 3 tracking, memory and attention modules.

## Current scope and next phase

Implemented: per-tab in-page blocking, local counts and ten arithmetic difficulty tiers, optional email/password accounts, and opt-in automatic website-list sync. Counts, difficulty and sessions remain device-local. The API is hosted on Render Free at https://progressive-friction-api.onrender.com with Supabase authentication/database services.

The development build includes **Level 2: simple linear equations and introductory derivatives**, **six-pair memory matching** in a 3 × 4 grid, **attention matching**, and a new **object-tracking game** replacing patterns. Tracking highlights one object, shuffles identical objects, then asks for its final position across three rounds with 3, 4 and 5 objects. Completed rounds persist; interrupted rounds replay. A step-by-step alternative supports reduced motion. The owner accepted memory and its pastel-card/no-caption refinements (M021), and tracking with further visual polish deferred (M022). At counts 31–50, randomly select one game per attempt: three tracking rounds, three attention stages, or one six-pair memory board. Completing that selected game unlocks once; no combined sequence or fixed two-minute duration is required (M023). The Level 4 timer is next, followed by deferred UI polish and full-range production activation. Subscriptions, dashboard/analytics and signature features remain later work; the product is not ready for the Chrome Web Store.

Development update: run `npm run build:challenge-dev` from `extension/` and load `extension/dist-dev`; the popup supports count edits, level jumps, module/question-type selection and website-specific resets. Levels 1–2 and standalone Level 3 tracking/memory/attention are available; Level 4 reports unavailable. For repeatable puzzle testing select **tracking**, **memory** or **attention**, then prepare it explicitly. Ordinary Level 3 selection randomly chooses one of these modules per new attempt; finishing that game alone unlocks. Default `npm run build` preserves production arithmetic and excludes testing controls. See [development testing instructions](extension/TESTING.md#modular-foundation-development-build).

See [roadmap](brain/phases.md), [execution evidence](brain/progress.md), [account setup](extension/INTEGRATION.md), [browser testing](extension/TESTING.md), [deployment](backend/DEPLOYMENT.md) and [database migrations](backend/supabase/README.md).

## Architecture for the next modules

Current development refinement: tracking replaces the numeric/shape pattern module; its old implementation and tests were removed. Unfinished saved pattern attempts and stale developer overrides are retired while counts and valid access remain intact. Attention grids vary shape and colour independently, include near matches, and add filled/outline matching in stage three. Actual solving time still needs owner testing. Tracking adds a moving task, but does not guarantee resistance to AI or automation.

Extend the implemented policy, shared metadata, registries, module contract, exactly-once coordinator and versioned local state. MV3 workers statically import pure models and invoke only the selected one; browser views load on demand. New modules must reuse the shared completion path. Full requirements: [modular challenge architecture](brain/project.md#required-modular-challenge-architecture).

Owner-approved [level rules](brain/project.md#approved-level-rules-2026-10-17) define boundaries, migration, retention and timer behavior. The latest owner clarification in progress.md M023 confirms one random Level 3 game per attempt at counts 31–50, superseding earlier combined-sequence notes. All six brain files are synchronized with this decision. Policy/migration, Levels 1–2 and standalone tracking/memory/attention are implemented in development; remaining modules are planned. Camera recognition is excluded. No new dependency or permission is required.

## Project Structure

```text
├── brain/                  # Project specifications, architecture, and planning docs
│   ├── instructions.md     # AI assistant guidelines and core constraints
│   ├── project.md          # Product vision, requirements, and user flows
│   ├── ui.md               # UI design system, UX specifications, and tokens
│   ├── techstack.md        # Technical stack and architectural choices
│   ├── phases.md           # Implementation milestones and task breakdown
│   └── progress.md         # Chronological execution log & context graph
│
├── extension/              # Chrome Extension (React + Vite)
│   ├── public/             # Static extension assets
│   │   └── manifest.json   # Chrome Extension Manifest V3 configuration
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Extension views (Popup, Blocked, Options, etc.)
│   │   ├── services/       # Chrome APIs, storage, and background services
│   │   ├── utils/          # Math generator, helpers, and formatters
│   │   ├── App.jsx         # Root React component
│   │   ├── main.jsx        # Extension entry point
│   │   └── index.css       # Global styles and design tokens
│   ├── package.json        # Extension dependencies and build scripts
│   └── vite.config.js      # Vite build configuration
│
├── backend/                # Express API, Supabase migrations, SQL checks and tests
├── render.yaml             # Render Free API configuration; manual deploys
├── .gitignore
└── README.md
```

## Getting Started

### Development
1. Navigate to the extension folder:
   ```bash
   cd extension
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Build extension:
   ```bash
   npm run build
   ```
5. Load the unpacked extension in Chrome via `chrome://extensions` (pointing to `extension/dist`). Reload it and refresh existing tabs after rebuilding.

### Backend and API selection

From `backend/`, run `npm ci`, configure an ignored `.env` using `.env.example`, and run `npm start` (default port 5000). Apply migrations in filename order as described in the database guide. Do not commit environment secrets.

For local extension development, the API defaults to localhost:5000. The current ignored `extension/.env.production` selects the Render HTTPS origin for production builds. Vite embeds the URL during the build; mode-specific environment values override generic `.env.local` values. A fresh checkout needs its own `.env.production` to use hosted staging. Account controls require the installed Chrome extension, not the Vite browser preview.

### Verification

Run `npm test`, `npm run lint`, `npm run build` and `npm run build:challenge-dev` from `extension/`, and `npm test` from `backend/`. Tracking replacement verification passed 267 extension tests across 30 files, lint and both builds; the backend's unchanged recorded checkpoint remains 80 tests. Production scans for control leakage; development exercises arithmetic, both Level 2 types, three-round tracking, memory and attention without DOM APIs/dynamic imports. See extension/TESTING.md for tracking Chrome acceptance and progress.md for approved historical milestones.

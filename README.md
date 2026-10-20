# Progressive Friction — Website Blocker

A Chrome extension designed to interrupt mindless browsing habits by introducing intentional friction before accessing self-restricted websites. Production currently uses legacy arithmetic; a separate development build implements the modular foundation and Level 1 arithmetic.

## Current scope and next phase

Implemented: per-tab in-page blocking, local counts and ten arithmetic difficulty tiers, optional email/password accounts, and opt-in automatic website-list sync. Counts, difficulty and sessions remain device-local. The API is hosted on Render Free at https://progressive-friction-api.onrender.com with Supabase authentication/database services.

The development build now includes **Level 2: simple linear equations and introductory derivatives**, with automated verification complete and owner Chrome testing pending. Next after acceptance are independent Level 3 puzzles and the Level 4 persistent timer. Those modules and full-range production activation remain unimplemented. Subscriptions, dashboard/analytics and signature features remain later work; the product is not ready for the Chrome Web Store.

Development update: the owner confirms foundation controls/blocking work after the MV3 fix; Level 2 Chrome acceptance is still pending. Run `npm run build:challenge-dev` from `extension/` and load `extension/dist-dev`; the popup supports count edits, level jumps, question-type selection and website-specific resets. Levels 1–2 are available; Levels 3–4 report unavailable. Default `npm run build` preserves production arithmetic and excludes testing controls. See [development testing instructions](extension/TESTING.md#modular-foundation-development-build).

See [roadmap](brain/phases.md), [execution evidence](brain/progress.md), [account setup](extension/INTEGRATION.md), [browser testing](extension/TESTING.md), [deployment](backend/DEPLOYMENT.md) and [database migrations](backend/supabase/README.md).

## Architecture for the next modules

Extend the implemented policy, shared metadata, registries, module contract, exactly-once coordinator and versioned local state. MV3 workers statically import pure models and invoke only the selected one; browser views load on demand. New modules must reuse the shared completion path. Full requirements: [modular challenge architecture](brain/project.md#required-modular-challenge-architecture).

Owner-approved [level rules](brain/project.md#approved-level-rules-2026-10-17) define boundaries, migration, retention, starter puzzles and timer behavior. Policy/migration and Levels 1–2 are implemented in development; later modules are planned. Brain status/progress updates await owner approval of this slice. Camera recognition is excluded. No speculative dependency or permission is required.

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

Run `npm test`, `npm run lint`, `npm run build` and `npm run build:challenge-dev` from `extension/`, and `npm test` from `backend/`. Level 2 verification passed 215 extension tests across 20 files, lint and both builds; the backend's unchanged recorded checkpoint remains 80 tests. Production scans for control leakage; development exercises arithmetic and both Level 2 types without DOM APIs/dynamic imports. See extension/TESTING.md for pending Chrome acceptance and progress.md for approved historical milestones.

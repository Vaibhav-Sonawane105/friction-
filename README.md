# Progressive Friction — Website Blocker

A Chrome extension designed to interrupt mindless browsing habits by introducing intentional friction: requiring users to complete progressive challenges before accessing self-restricted websites. The current implementation is arithmetic-only; the next architecture supports independent challenge modules.

## Current scope and next phase

Implemented: per-tab in-page blocking, local counts and ten arithmetic difficulty tiers, optional email/password accounts, and opt-in automatic website-list sync. Counts, difficulty and sessions remain device-local. The API is hosted on Render Free at https://progressive-friction-api.onrender.com with Supabase authentication/database services.

Next is the **modular challenge foundation**, followed by **Phase 1 Enhancement — Progressive Challenge Levels**: arithmetic, equations, easy puzzles and a persistent pause/resume timer. The four-level mechanism is not implemented yet. Subscription, dashboard/analytics and signature features remain on the roadmap; deployment does not mean the product is ready for the Chrome Web Store.

See [roadmap](brain/phases.md), [execution evidence](brain/progress.md), [account setup](extension/INTEGRATION.md), [browser testing](extension/TESTING.md), [deployment](backend/DEPLOYMENT.md) and [database migrations](backend/supabase/README.md).

## Required architecture for the next implementation

Separate progression rules, a stable challenge registry, independent on-demand modules, shared exactly-once completion and versioned local state. Adding a new module must not duplicate unlock/count logic or require rewriting existing games. Preserve website counts and settings during migration from the existing arithmetic code. Full requirements: [modular challenge architecture](brain/project.md#required-modular-challenge-architecture).

Scope is the foundation plus arithmetic, equations, easy puzzles and persistent timer. Camera recognition is outside the current roadmap. This architecture is approved direction, not implemented functionality; no dependency or permission for speculative future challenges is being added.

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

Run `npm test`, `npm run lint` and `npm run build` from `extension/`, and `npm test` from `backend/`. Last recorded passing implementation results were 61 extension tests and 72 backend tests plus lint/build; not rerun for this documentation audit. Live SQL/browser results are distinguished from mocked tests in progress.md. Missing lifecycle regression coverage and advanced-level tests remain follow-ups.

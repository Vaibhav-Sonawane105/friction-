<p align="center">
  <img src="extension/public/assets/app%20logo/icon-128.png" alt="Progressive Friction logo" width="80" />
</p>

# Progressive Friction

**A Chrome extension that puts a deliberate pause between an impulse and a distracting website.**

Progressive Friction interrupts mindless browsing by asking you to complete a challenge before accessing websites you choose to restrict. Each website has its own progression: the more often you unlock it, the more effort its challenges require, up to a capped level.

Built with **React, JavaScript, Chrome Manifest V3, Node.js, Express, and Supabase**. Core blocking and challenges work locally without an account or a running backend.

> **Status:** Early preview, installed manually in desktop Chrome. The redesigned preview includes four challenge types across four levels. A Chrome Web Store release is planned; difficulty tuning and release acceptance are ongoing.

## How it works

1. Add a website you want to restrict, such as `youtube.com`.
2. Visiting it displays an in-page challenge overlay.
3. Complete the challenge to unlock that tab, or choose **Leave**.
4. Browse within that domain during the active tab session, including refreshes.
5. Leaving the domain or closing the tab ends its unlock.

Each successful unlock advances that website's progression once. Tabs unlock independently. Closing Chrome or reloading the extension ends temporary access while keeping saved website counts.

## Features

- **Choose your restrictions:** Add, disable, or remove domains from the popup. The current build supports up to two configured websites.
- **Progressive difficulty:** Each website tracks successful unlocks independently. Incorrect answers and refreshes do not increase its count.
- **Four rotating challenges:** Maths, memory, route planning, and logical ordering appear at every level in the redesigned preview.
- **Resumable puzzles:** Refreshing restores the assigned puzzle and saved progress. Incorrect submissions preserve completed work.
- **Local operation:** Blocking, challenges, and progression continue offline and during backend outages.
- **Optional accounts and sync:** Email/password authentication and explicitly enabled cloud sync for website domains and enabled settings.
- **Distinct interface:** Strong borders, bright accents, and dedicated interactions for each challenge.

### Challenges and progression

| Challenge | What you do |
| --- | --- |
| Maths | Solve a short set of arithmetic, missing-value, number-constraint, or operator-selection questions. |
| Memory | Find all matching pairs, without a time or move limit. |
| Route planning | Visit checkpoints and reach the exit without crossing walls or revisiting cells. |
| Logical ordering | Arrange objects to satisfy visible clues. |

The level uses the website's successful-unlock count **before the current attempt**:

| Level | Prior successful unlocks | Memory pairs |
| --- | --- | --- |
| 1 | 0–20 | 3 |
| 2 | 21–30 | 4 |
| 3 | 31–50 | 6 |
| 4 | 51+ | 8 |

All four types rotate at every level. Completing one assigned puzzle unlocks the tab once; there is no mandatory waiting period. Counts do not reset overnight, and challenges continue at Level 4.

## Installation

### Build and load the preview

You need **desktop Google Chrome**, **Node.js 22.12+**, and **npm**. Git is needed for the clone command; alternatively, download and extract the repository ZIP from GitHub.

```bash
git clone https://github.com/Vaibhav-Sonawane105/friction-.git
cd friction-/extension
npm ci
npm run build:private-preview
```

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select **`extension/dist-preview`** inside your local repository: the generated folder containing `manifest.json`.
5. Open **Progressive Friction — Private Preview** from Chrome's extensions menu and optionally pin it.
6. Add a domain, then visit it to try a challenge. Refresh any tabs already open before adding the restriction.

No account, API key, or backend setup is needed to try the core experience. Optional account features use the preview's hosted staging API.

Keep the built folder on your computer: Chrome loads the extension from that location. After updating the source, rebuild, click **Reload** on the extension card, and refresh restricted tabs. Unpacked extensions do not update automatically. Disable other installed copies while trying this build.

### Available builds

Run these commands from `extension/`:

| Command | Output folder | Purpose |
| --- | --- | --- |
| `npm run build:private-preview` | `dist-preview` | Redesigned challenges at all four levels, normal progression, and no developer controls. Recommended for trying the project. |
| `npm run build:challenge-dev` | `dist-dev` | Redesigned challenges with developer controls for repeatable testing. |
| `npm run build` | `dist` | Existing default build with legacy arithmetic challenges. |

Load the corresponding output folder through **Load unpacked**. `npm run dev` starts a Vite UI preview; use an installed extension to exercise Chrome APIs and account controls.

## Privacy and permissions

Website settings, unlock counts, puzzle progress, and temporary access are handled locally. Signing in alone does not upload your website list. Enabling automatic sync shares only **domains and their enabled settings**. Counts, puzzle state, full URLs, and browsing history are not uploaded by the extension.

Account tokens are held in Chrome session storage and cleared when Chrome closes or the extension reloads. Passwords are not stored by the extension.

Website access lets the extension insert its challenge overlay. The `storage`, `tabs`, `webNavigation`, and `alarms` permissions support saved state, tab lifecycle, navigation handling, and sync scheduling.

The restriction is an **in-page overlay**: it does not stop the website's network requests or prevent every bypass. You can disable/remove a domain in the popup or disable/uninstall the extension through Chrome's normal controls.

## Technical overview

- **Extension:** React 19, Vite, Tailwind CSS, and Chrome Manifest V3. Content scripts display the challenge interface inside an isolated Shadow DOM.
- **Challenge engine:** Independent puzzle models, shared progression policy, and separate worker/browser registries. The background service worker validates actions and coordinates completion to prevent duplicate count increments.
- **State:** Versioned local attempts and per-tab access are separate from optional account sync. Worker models use static imports; browser challenge views load on demand.
- **Backend:** Express API with Supabase Auth and PostgreSQL, Row Level Security, and revision-based website-list synchronization.
- **Verification:** Vitest covers puzzle generation, progression, state migration, unlock lifecycle, authentication, and sync. Build scripts check emitted MV3 workers and developer-control exclusion where required.

```text
extension/
  public/           Manifest and static assets
  src/challenges/   Puzzle models, views, registries, and progression
  src/components/   Popup and challenge interface components
  src/services/     Storage, blocking, accounts, and sync
  scripts/          Build verification
backend/
  src/              Express API, routes, and authentication middleware
  supabase/         Database migrations and SQL checks
  tests/            API regression tests
docs/               Preview guides, design notes, and implementation plans
brain/              Product specifications and development history
```

## Local development

### Optional backend setup

The backend is needed when developing or self-hosting account and sync features.

1. Create a Supabase project and apply migrations in filename order using the [database setup guide](backend/supabase/README.md).
2. From `backend/`, run `npm ci`.
3. Copy `backend/.env.example` to `backend/.env` and configure your Supabase URL and anon/publishable key.
4. Run `npm run dev` from `backend/`. The default API port is `5000`.
5. For the challenge development build, create `extension/.env.challenge-dev.local` with:

   ```dotenv
   VITE_API_URL=http://localhost:5000
   ```

6. Run `npm run build:challenge-dev` from `extension/` and load `extension/dist-dev` in Chrome.

The private-preview build uses the production-mode public API URL, falling back to hosted staging. To point it at your own API, set `VITE_API_URL` in an ignored `extension/.env.production.local` and rebuild. Vite embeds the URL at build time. Keep credentials out of extension files and do not commit environment files.

See [account integration](extension/INTEGRATION.md) and [backend deployment](backend/DEPLOYMENT.md) for detailed configuration. Hosted staging may take time to wake after inactivity; local blocking continues independently. Some detailed development notes describe earlier milestones; use the build table above for the current preview behavior.

### Verification commands

From `extension/`:

```bash
npm test
npm run lint
npm run build
npm run build:challenge-dev
npm run build:private-preview
```

From `backend/`:

```bash
npm test
```

Browser and multi-device checks are documented in the [testing guide](extension/TESTING.md). Automated tests do not replace real Chrome testing or repeated-use difficulty feedback.

## Project direction

The current focus is refining challenge difficulty, accessibility, and the preview experience before a Chrome Web Store release. Subscriptions, a companion dashboard, and analytics remain future work.

See the [roadmap](brain/phases.md), [preview instructions](docs/private-preview/START_HERE.txt), and [challenge pilot worksheet](docs/private-preview/REDESIGN-PILOT.md) for more detail.

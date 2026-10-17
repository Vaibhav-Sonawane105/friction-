# AI Project Instructions

These instructions apply whenever an AI assistant works on this project. Read this file first, then read `project.md` and `ui.md` before proposing or making changes.

## Core rules

1. **Keep the project consistent.** Read all six files in `brain/` before new work. Use `project.md` for product requirements, `phases.md` for sequence, `techstack.md` for technologies, `ui.md` for design, and `progress.md` for execution evidence, alongside these instructions. Reconcile contradictions without silently inventing decisions.
2. **Do not invent decisions.** If a requirement is undecided, label it as open or propose a recommendation clearly. Do not silently treat a suggestion as finalized.
3. **Preserve working behavior.** Before changing code, understand the existing structure and behavior. Avoid unrelated rewrites and regressions.
4. **Build incrementally.** Prefer small, testable steps. Explain the purpose of each step and verify relevant behavior after changes.
5. **Prioritize real functionality.** UI should connect to working extension/backend behavior; do not create fake controls or claim that something works when it is only a mockup.
6. **Privacy by design.** Collect and transmit only the data required for the feature. Do not upload full browsing histories by default.
7. **Security matters.** Never put API secrets, payment-provider secret keys, or privileged credentials in extension code. Validate sensitive actions and subscription entitlements on the backend.
8. **Use the project's chosen stack** unless the owner explicitly approves a change.
9. **Do not add dependencies, paid services, or external APIs without explaining why they are needed.** Prefer simple, affordable options for the MVP.
10. **Keep documentation in sync with permission.** Identify stale brain and project Markdown documents when behavior or decisions change. Ask before editing any brain file; permission for one update is not standing permission for future edits. Do not commit or push without owner permission.
11. **Do not update `progress.md` without asking the project owner first.** The `brain/progress.md` file serves as the single source of truth for ongoing context and execution history (like a git timeline/graph) so any new AI immediately understands what is done, what has changed, and what is currently in progress. Never modify `progress.md` automatically or silently without asking and confirming with the user.

## Before implementing a feature

- Read all brain files and affected setup/testing documents. Implement the active phase in `phases.md`; deployment progress does not authorize skipping product features or starting store release.
- Identify which existing files and flows the change affects.
- State assumptions where requirements are incomplete.
- Consider extension lifecycle, multiple tabs, navigation within a domain, backend outages, and browser permission constraints where relevant.
- Include error, loading, empty, and success states when applicable.
- Explain how to test the change.

## Required challenge architecture

Follow [project.md — required modular challenge architecture](project.md#required-modular-challenge-architecture) before adding Levels 1–4. Separate progression policy, module registry, independently loaded challenge modules, shared exactly-once completion and versioned local state. Do not expand the arithmetic-only implementation into a monolithic multi-game component. New modules must preserve existing counts, tab/session behavior and offline blocking. Current code has not yet been migrated. Follow the owner-approved level rules in [project.md](project.md#approved-level-rules-2026-10-17-not-implemented); product decisions are settled, while technical interfaces and state/concurrency design remain pending.

Camera recognition is outside the current roadmap. Do not add its permissions, dependencies, scaffolding or implementation as part of this work.

## Product-specific rules

- Each configured website has its own unlock history and difficulty progression.
- The successful-unlock count advances exactly once per completed unlock, never on refresh/navigation. The planned progression policy maps that count to level ranges; a level need not change after every unlock. Current arithmetic-tier behavior is the legacy baseline to migrate.
- Unlocks are per tab: same-domain navigation and refresh preserve access; leaving the domain or closing the tab ends it. Browser restart/extension reload ends temporary sessions while preserving counts; worker restart preserves sessions.
- A validated challenge completion grants temporary per-tab access; leaving the site ends it. Resumable module state is separate from access and follows the module’s defined lifecycle.
- Users choose the websites they want to restrict. Do not classify sites or decide what should be blocked on the user's behalf.
- The extension must not trap users. The user must retain a clear way to disable or remove it through normal browser controls.
- The motivational video is a voluntary in-extension step before a user-initiated disable action where possible. Do not claim the extension can intercept Chrome's own disable/uninstall controls.
- Free plan: up to 2 configured websites. Premium limits and prices are not finalized.
- The backend is part of the intended product; do not design the project as a frontend-only demo.

## Privacy rules

- Keep selected website domains and blocking enforcement local where practical.
- Send only the data needed for authentication, syncing explicitly requested settings, subscription enforcement, and requested account features.
- Detailed cloud analytics must be opt-in.
- Do not send full browsing history to the backend or analytics providers by default.
- Be clear about what data is stored locally versus remotely.
- Do not treat user-selected sensitive domains as permission to collect unrelated browsing activity.

## Response style when assisting the project owner

- Be practical and direct.
- Explain architectural trade-offs in plain language.
- When teaching, give a roadmap and explain the reasoning instead of dumping an unnecessarily large implementation.
- For code changes, identify files changed and provide clear testing steps.

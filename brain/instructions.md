# AI Project Instructions

These instructions apply whenever an AI assistant works on this project. Read this file first, then read `project.md` and `ui.md` before proposing or making changes.

## Core rules

1. **Keep the project consistent.** Treat the three files in this `brain/` folder as the shared source of truth. If a decision changes, update the relevant document instead of letting contradictory assumptions accumulate.
2. **Do not invent decisions.** If a requirement is undecided, label it as open or propose a recommendation clearly. Do not silently treat a suggestion as finalized.
3. **Preserve working behavior.** Before changing code, understand the existing structure and behavior. Avoid unrelated rewrites and regressions.
4. **Build incrementally.** Prefer small, testable steps. Explain the purpose of each step and verify relevant behavior after changes.
5. **Prioritize real functionality.** UI should connect to working extension/backend behavior; do not create fake controls or claim that something works when it is only a mockup.
6. **Privacy by design.** Collect and transmit only the data required for the feature. Do not upload full browsing histories by default.
7. **Security matters.** Never put API secrets, payment-provider secret keys, or privileged credentials in extension code. Validate sensitive actions and subscription entitlements on the backend.
8. **Use the project's chosen stack** unless the owner explicitly approves a change.
9. **Do not add dependencies, paid services, or external APIs without explaining why they are needed.** Prefer simple, affordable options for the MVP.
10. **Keep documentation in sync.** If architecture, product behavior, UI rules, data collection, or subscription policy changes, update the appropriate `brain/` document.
11. **Do not update `progress.md` without asking the project owner first.** The `brain/progress.md` file serves as the single source of truth for ongoing context and execution history (like a git timeline/graph) so any new AI immediately understands what is done, what has changed, and what is currently in progress. Never modify `progress.md` automatically or silently without asking and confirming with the user.

## Before implementing a feature

- Read `brain/instructions.md`, `brain/project.md`, and `brain/ui.md`.
- Identify which existing files and flows the change affects.
- State assumptions where requirements are incomplete.
- Consider extension lifecycle, multiple tabs, navigation within a domain, backend outages, and browser permission constraints where relevant.
- Include error, loading, empty, and success states when applicable.
- Explain how to test the change.

## Product-specific rules

- Each configured website has its own unlock history and difficulty progression.
- Difficulty increases after each **successful unlock**, not on refreshes or ordinary navigation within the same domain.
- An unlock is intended to last until the user leaves the website. The exact multi-tab/session policy must be implemented consistently and documented.
- A correct answer grants temporary access; leaving the site means the next visit requires a new challenge.
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

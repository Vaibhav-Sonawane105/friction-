# UI / UX Guidelines

This file defines the visual and interaction direction for the Chrome extension and its planned companion web dashboard. The visual system uses a bold **Neo-Brutalism** aesthetic featuring crisp black borders, hard offset shadows, vibrant accent fills, and distinct typography pairing. The implemented popup and arithmetic overlay are the current visual baseline; future interface areas below are design guidance, not claims of completed features.

## Product feel

The product should feel bold, high-contrast, playful, interactive, and unapologetically striking. It avoids generic minimalist corporate design in favor of tactile neo-brutalism elements—strong borders, solid black drop shadows, and vibrant badge accents—while keeping core settings and blocking mechanics completely clear and functional.

## Visual Direction & Style System

### Color Palette
- **Canvas / Background Surfaces:** Popup canvas `#F5F5F5`, white cards `#FFFFFF`, overlay surface `#F4F4F6`, and equation solution bar `#ECECEC`.
- **Borders & Outlines:** Black (`#000000`), with widths chosen by component role as described below.
- **Primary Accents & Fills:**
  - **Turquoise (`#4ECDC4`):** Primary action highlights, active states, and success buttons (e.g., "Leave" button).
  - **Red / Coral (`#F24822`):** Warning states, restricted icon highlights, and alert text.
  - **Yellow (`#FBE76D`):** Status indicators, tier badges (e.g., "Tier 3 equation").
  - **Soft Pink (`#FFB8B5`):** Secondary highlights and container accents.
  - **Dark Neutral Text (`#000000` / `#555555` / `#757575`):** High-contrast typography and secondary descriptions; input placeholders also use `#888888`.
- **Signature Gradient (Backdrops/Frames):**
  - Linear Gradient: `0%` (`#80E8FF`), `33%` (`#FFCBAA`), `70%` (`#D9B7F9`), `100%` (`#FF699B`).

### Typography
- **JejuGothic:** Used specifically for primary headings, equations, and prominent action buttons (e.g., "Leave").
- **Istok Web:** Used for all body copy, descriptive text, input placeholder labels, secondary stats, and standard navigation items.

### Neo-Brutalism Component Rules (Boxes & Containers)
- **Borders:** Main popup controls, domain rows, header/footer separators, and challenge controls use **2px black borders**. Compact domain icons, tier tags, remove buttons, and account-panel controls use **1px black borders**. The empty-domain state uses a 2px dashed border. Do not add borders to every layout wrapper.
- **Hard Drop Shadows:** Match the component's existing shadow rather than applying one universal offset. The overlay tokens in [`extension/src/index.css`](../extension/src/index.css) are `shadow-brutal-card` (7px / 6px black), `shadow-brutal-header` (4px / 4px black), `shadow-brutal-badge` (3px / 3px black), `shadow-brutal-input` (4px / 4px hot pink), and `shadow-brutal-submit` (4px / 4px turquoise). These shadows have no blur.
- **Popup Shadows:** Compact controls use smaller hard shadows: header icons/status 2px / 2px black, domain rows and add button 3px / 3px black, domain input 3px / 3px hot pink, remove button 1px / 1px black, and account panel/actions 3px / 2px black.
- **Corner Radius:** Preserve the existing size hierarchy: compact controls use `rounded` / `rounded-md` / `rounded-lg` (4 / 6 / 8px); challenge controls and the empty state use `rounded-xl` (12px); the equation card uses 12px, increasing to `rounded-2xl` (16px) at the small breakpoint. The overlay's outer gradient wrapper uses 36px and its inner surface uses 30px. Circular status dots remain circular.
- **Gradient Glow Exception:** The overlay's outer gradient frame deliberately uses soft cyan/pink glow shadows. The no-blur rule applies to component drop shadows, not this decorative frame.

### Current Layout Baseline
- **Popup:** 380px wide, minimum height 460px, with compact spacing and controls suited to the extension popup.
- **Challenge Overlay:** Centered frame with maximum width 780px, a 6px gradient surround, and an inner surface with 44px vertical / 48px horizontal padding and minimum height 640px. The injected overlay dims and blurs the underlying page; the standalone blocked page uses the same challenge card.
- **Equation Controls:** Keep the large centered equation and equally sized answer/submit controls; allow the control row to wrap. Preserve responsive typography and card-radius changes rather than applying popup sizing to the overlay.
- These dimensions describe the current implementation, not a guarantee that every small viewport has been verified. Accessibility and responsive-layout principles below remain requirements for future changes.

## UX Principles

1. **The active challenge is the main interaction.** Keep arithmetic/equation input, puzzle controls and waiting progress understandable and keyboard-accessible. The required module architecture in [project.md](project.md#required-modular-challenge-architecture) owns the behavior; this file defines a shared visual language, not a single arithmetic-only layout.
2. **Show progress without shaming by default.** The product can be intense and humorous, but core settings and analytics should stay respectful.
3. **Explain the rules.** Show the current challenge level and explain that successful unlock counts select level ranges, while access remains temporary. Distinguish planned four-level progression from the current arithmetic tiers.
4. **Keep friction intentional.** Avoid accidental difficulty increases from refreshes, same-domain navigation, or technical failures.
5. **Clear feedback.** Provide visible states for wrong answers, correct answers, loading, errors, and temporarily unavailable backend services.
6. **Accessible interactions.** Support keyboard navigation, visible focus indicators, semantic labels, sufficient text contrast, and reduced-motion preferences.
7. **Privacy transparency.** Clearly distinguish local data from account data synced to the backend.
8. **Subscription transparency.** Clearly display the free website limit, premium benefits, billing period, renewal terms, and cancellation path.
9. **No deceptive traps.** The user must be able to leave the challenge or disable the product through normal browser controls.
10. **Responsive layouts.** Extension popup screens must fit the compact popup frame; dashboard pages should adapt fluidly to desktop and mobile screen widths.

## Key Interface Areas

### Extension Setup
- Briefly explain extension functionality with Istok Web descriptions paired with JejuGothic headings.
- Allow users to choose domains explicitly using neo-brutalist pill boxes with solid black borders and shadows.
- Display free-plan limits upfront before users reach them.
- Clarify local vs. cloud account storage.

### Modular Challenge Experience (planned; existing UI is arithmetic only)

Use a shared shell for website identity, level, instructions, loading/error/saving feedback and leaving the page. Render the selected module inside it; do not force puzzle or waiting interactions into an equation input form. Preserve the visual tokens below; no redesign is approved by this architecture decision.

- Arithmetic and equation modules use the equation/input rules below.
- Puzzle modules supply appropriate accessible controls with clear completion feedback.
- Timer module shows remaining time and pause/resume state without requiring an answer field. Pause while hidden/minimized or away; restore the saved timer without rerolling its duration. Follow the [approved level rules](project.md#approved-level-rules-2026-10-17-not-implemented).
- Shared completion/saving feedback prevents repeat submissions; module changes clean up old interactions and resources.
- Saved state restoration and module-load failure need understandable feedback; they must not silently reset progression or grant access.
- Camera recognition is outside the current roadmap; no camera UI is part of this phase.

### Arithmetic and Equation Modules
- Display the equation prominently using **JejuGothic** typography inside a clean white container with a 2px black border, responsive 12–16px corners, and `shadow-brutal-card`.
- Provide a clear input field and a submit button styled with neo-brutalist geometry.
- Communicate incorrect answers clearly without revealing solutions unless intended.
- Confirm success visually and show the applicable level/progression state (e.g., using yellow/turquoise badge containers); do not assume the level changes after every completion.
- Do not count page refreshes as new unlocks.

### Dashboard
- Display configured websites alongside each site's difficulty level using vibrant neo-brutalist status tags.
- Present unlock counts and trends clearly without implying health/behavioral claims.
- Provide simple edit/remove site controls utilizing solid-bordered interactive boxes.
- Clearly separate local stats from optional cloud analytics.

### Motivation Sequence
- Incorporate anime motivational content framed within neo-brutalist modal boxes.
- Treat as an in-extension, user-initiated step when choosing to pause or give up.
- Provide an unmistakable neo-brutalist action button to resume or exit.

### Subscription
- Present Free vs. Premium tiers cleanly with neo-brutalist feature cards.
- Clearly highlight the 2-website free plan allowance.
- Maintain transparent pricing, billing terms, and cancellation flows without dark patterns.

## Component Consistency

Before adding a new component, reuse the active popup components or [`BlockedChallengeCard`](../extension/src/components/blocked/BlockedChallengeCard.jsx), and use the shared tokens in [`extension/src/index.css`](../extension/src/index.css). Select borders, shadows, and radii by component role using the baseline above. Maintain consistent spacing scales, font segregation (JejuGothic vs. Istok Web), and accessibility focus states. Future dashboard and challenge-module designs should extend this visual language; they do not require an automatic restyle of the current interface.

# UI / UX Guidelines

This file defines the visual and interaction direction for the Chrome extension and its companion web dashboard. The visual system uses a bold **Neo-Brutalism** aesthetic featuring crisp black borders, hard offset shadows, vibrant accent fills, and distinct typography pairing.

## Product feel

The product should feel bold, high-contrast, playful, interactive, and unapologetically striking. It avoids generic minimalist corporate design in favor of tactile neo-brutalism elements—strong borders, solid black drop shadows, and vibrant badge accents—while keeping core settings and blocking mechanics completely clear and functional.

## Visual Direction & Style System

### Color Palette
- **Canvas / Background Surfaces:** Clean light neutral (`#F5F5F5`, `#FFFFFF`).
- **Borders & Outlines:** Solid black (`#000000`, 1px solid).
- **Primary Accents & Fills:**
  - **Turquoise (`#4ECDC4`):** Primary action highlights, active states, and success buttons (e.g., "Leave" button).
  - **Red / Coral (`#F24822`):** Warning states, restricted icon highlights, and alert text.
  - **Yellow (`#FBE76D`):** Status indicators, tier badges (e.g., "Tier 3 equation").
  - **Soft Pink (`#FFB8B5`):** Secondary highlights and container accents.
  - **Dark Neutral Text (`#000000` / `#4F4F4F` / `#757575`):** High-contrast typography and secondary descriptions.
- **Signature Gradient (Backdrops/Frames):**
  - Linear Gradient: `0%` (`#80E8FF`), `33%` (`#FFCBAA`), `70%` (`#D9B7F9`), `100%` (`#FF699B`).

### Typography
- **JejuGothic:** Used specifically for primary headings, equations, and prominent action buttons (e.g., "Leave").
- **Istok Web:** Used for all body copy, descriptive text, input placeholder labels, secondary stats, and standard navigation items.

### Neo-Brutalism Component Rules (Boxes & Containers)
- **Borders:** Every box, card, container, and button must feature a strict **1px solid black (`#000000`) border**.
- **Hard Drop Shadows:** Apply a solid drop shadow effect with **X = 6px, Y = 4px, Color = Solid Black (`#000000`)**. No soft or blurred gradients on shadows.
- **Corner Radius:** Rounded corners strictly set between **4px and 6px** depending on the component size.

## UX Principles

1. **The equation is the main interaction.** Make the challenge immediately understandable, readable, keyboard-accessible, and quick to answer.
2. **Show progress without shaming by default.** The product can be intense and humorous, but core settings and analytics should stay respectful.
3. **Explain the rules.** Users should understand that difficulty rises after each successful unlock and that access is temporary.
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

### Math Challenge
- Display the equation prominently using **JejuGothic** typography inside a clean white container box with 1px black border and hard shadow.
- Provide a clear input field and a submit button styled with neo-brutalist geometry.
- Communicate incorrect answers clearly without revealing solutions unless intended.
- Confirm success visually and display the next difficulty tier (e.g., using yellow/turquoise badge containers).
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

Before adding a new component, reuse existing neo-brutalist button and card structures (1px black border, X=6 / Y=4 solid shadow, 4–6px border radius). Maintain consistent spacing scales, font segregation (JejuGothic vs. Istok Web), and accessibility focus states across both the Chrome extension popup and web dashboard.

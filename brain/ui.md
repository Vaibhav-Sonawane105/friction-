# UI / UX Guidelines

This file defines the visual and interaction direction for the Chrome extension and its companion web dashboard[cite: 1]. The visual system uses a **Tactile Editorial Minimalist** aesthetic inspired by paper-cut artwork, warm textures, and refined editorial typography[cite: 2].

## Product feel

The product should feel focused, bold, human, and motivating—avoiding the cold feel of a generic corporate admin panel[cite: 1]. It balances whimsical artistic warmth with clear, high-contrast utility[cite: 1, 2]. Anime motivation elements integrate naturally into the textured collage feel, while blocking and account settings remain clear and trustworthy[cite: 1, 2].

## Visual Direction & Style System

### Color Palette
- **Canvas / Background:** Warm off-white/ecru (`#F5F3EC` / `#FAF8F5`) creating a soft paper texture base[cite: 2].
- **Primary Text & High-Contrast Elements:** Deep charcoal / soft black (`#1E1E1E` / `#222222`)[cite: 2].
- **Primary Action Accent:** Solid dark charcoal capsule buttons with bold contrast[cite: 2].
- **Organic Accent Palette (Used sparingly for categories, progress, & states):**
  - **Dusty Rose:** `#E8A2A8` (Motivations / Highlights)[cite: 2]
  - **Mustard / Ochre:** `#E0A238` (Challenge / Friction highlights)[cite: 2]
  - **Sage Green:** `#8DAA82` (Success / Active states)[cite: 2]
  - **Slate Blue:** `#A3B8C2` (Secondary backgrounds & subtle containers)[cite: 2]
- **Dividers & Strokes:** Delicate thin neutral rules (`#D8D4C9`)[cite: 2].

### Typography
- **Display / Headers:** Sophisticated Editorial Serif (e.g., *Playfair Display*, *Instrument Serif*, or *Cinzel*) for section titles and primary callouts[cite: 2].
- **Body & Controls:** High-legibility Sans-Serif (e.g., *Inter*, *Plus Jakarta Sans*) for equation inputs, body text, data panels, and navigational links[cite: 2].

### Imagery & Artwork Guidelines
- **Style:** Tactile collage and paper-cut vector style[cite: 2].
- **Textures:** Stippling / halftone dot overlays, organic brush edges, subtle grain, and light line-art accents[cite: 2].
- **Shapes:** Layered organic forms, fluid land-like silhouette cuts, and minimalist vector icons[cite: 2].
- **Avoid:** Heavy glossy gradients, glassmorphism, muddy drop shadows, hyper-realistic stock photos, and cluttered neon UI elements[cite: 1, 2].

### Core UI Components
- **Buttons:** Fully rounded capsule/pill shape with solid charcoal fill and white high-contrast text[cite: 2].
- **Iconography:** Circular solid dark badges hosting crisp, white line-art symbols[cite: 2].
- **Containers & Cards:** Clean, flat surfaces with soft cream backgrounds, subtle thin borders, and ample internal padding[cite: 2].
- **Dividers:** Minimalist vertical and horizontal hairline strokes for editorial sectioning[cite: 2].

## UX Principles

1. **The equation is the main interaction.** Make the challenge immediately understandable, readable, keyboard-accessible, and quick to answer[cite: 1].
2. **Show progress without shaming by default.** The product can be intense and humorous, but core settings and analytics should stay respectful[cite: 1].
3. **Explain the rules.** Users should understand that difficulty rises after each successful unlock and that access is temporary[cite: 1].
4. **Keep friction intentional.** Avoid accidental difficulty increases from refreshes, same-domain navigation, or technical failures[cite: 1].
5. **Clear feedback.** Provide visible states for wrong answers, correct answers, loading, errors, and temporarily unavailable backend services[cite: 1].
6. **Accessible interactions.** Support keyboard navigation, visible focus indicators, semantic labels, sufficient text contrast, and reduced-motion preferences[cite: 1].
7. **Privacy transparency.** Clearly distinguish local data from account data synced to the backend[cite: 1].
8. **Subscription transparency.** Clearly display the free website limit, premium benefits, billing period, renewal terms, and cancellation path[cite: 1].
9. **No deceptive traps.** The user must be able to leave the challenge or disable the product through normal browser controls[cite: 1].
10. **Responsive layouts.** Extension popup screens must fit the compact popup frame; dashboard pages should adapt fluidly to desktop and mobile screen widths[cite: 1].

## Key Interface Areas

### Extension Setup
- Briefly explain extension functionality with clear serif headings and sans-serif descriptions[cite: 1, 2].
- Allow users to choose domains explicitly using clean pill tags or minimalist lists[cite: 1, 2].
- Display free-plan limits upfront before users reach them[cite: 1].
- Clarify local vs. cloud account storage[cite: 1].

### Math Challenge
- Display the equation prominently in high-contrast serif/sans typography[cite: 1, 2].
- Provide a clear, labeled input field paired with a charcoal pill submit button[cite: 1, 2].
- Communicate incorrect answers clearly without revealing solutions unless intended[cite: 1].
- Confirm success visually with sage green accents and display the next difficulty tier[cite: 1, 2].
- Do not count page refreshes as new unlocks[cite: 1].

### Dashboard
- Display configured websites alongside each site's difficulty level using organic color badges[cite: 1, 2].
- Present unlock counts and trends clearly without implying health/behavioral claims[cite: 1].
- Provide simple edit/remove site controls utilizing circular line-art icons[cite: 1, 2].
- Clearly separate local stats from optional cloud analytics[cite: 1].

### Motivation Sequence
- Incorporate anime motivational content framing it within the tactile illustration style[cite: 1, 2].
- Treat as an in-extension, user-initiated step when choosing to pause or give up[cite: 1].
- Provide an unmistakable capsule button to resume or exit[cite: 1, 2].

### Subscription
- Present Free vs. Premium tiers cleanly with simple feature breakdown lists[cite: 1].
- Clearly highlight the 2-website free plan allowance[cite: 1].
- Maintain transparent pricing, billing terms, and cancellation flows without dark patterns[cite: 1].

## Component Consistency

Before adding a new component, reuse existing pill buttons, circular icons, or hairline card layouts[cite: 1, 2]. Maintain consistent spacing scales, typography hierarchy, and accessibility focus states across both the Chrome extension popup and web dashboard[cite: 1, 2].

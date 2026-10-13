# Progressive Friction — Website Blocker

A Chrome extension designed to interrupt mindless browsing habits by introducing intentional friction: requiring users to solve a math challenge before accessing self-restricted websites, with progressive difficulty increases after each unlock.

## Project Structure

```text
├── brain/                  # Project specifications, architecture, and planning docs
│   ├── instructions.md     # AI assistant guidelines and core constraints
│   ├── project.md          # Product vision, requirements, and user flows
│   ├── ui.md               # UI design system, UX specifications, and tokens
│   ├── techstack.md        # Technical stack and architectural choices
│   └── phases.md           # Implementation milestones and task breakdown
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
5. Load the unpacked extension in Chrome via `chrome://extensions` (pointing to `extension/dist`).

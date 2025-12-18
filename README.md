# AUTOME - AI Browser Assistant

An AI-powered Chrome extension that helps you organize tabs, remember important information, and get proactive suggestions.

## Features

AUTOME is a collaborative copilot: it suggests and drafts, but keeps the user in control. Memory is optional and user-managed.

### Core Features (Implemented)
- ✅ **AI Tab Categorization** - Groups tabs by topic (backend LLM when configured; local fallback)
- ✅ **Browser Memory System** - Save highlights and search them later
- ✅ **Proactive Suggestions** - Generates 1–2 suggestions from page context + memories (backend LLM when configured; local fallback)
- ✅ **Command Palette** - Quick access with Alt+J (Cmd+J on Mac)

### Use Cases (Implemented, with fallbacks)
- ✅ Email Personalization (draft generation; can optionally use recent Gmail snippets + memories)
- ✅ Meeting Preparation (brief + talking points)
- ✅ YouTube Summarization (best-effort from page context)
- ✅ Email Categorization (Gmail + LLM when connected; heuristic/memories fallback)
- ✅ Meeting Notes (template)
- ✅ Data Cleaning (trim/dedupe)
- ✅ Research Compilation (from memories + page context)
- ⚠️ Cross-Platform Sync (runs a Composio tool slug; requires backend key + connected account)
- ✅ Resume Update (best-effort from page context)

## Tech Stack

### Extension
- React 18 + TypeScript
- Vite (build tool)
- Zustand (state management)
- Tailwind CSS
- Chrome Manifest V3

### Backend
- Next.js 14 (App Router)
- Prisma ORM
- SQLite (development)
- TypeScript

## Getting Started

### Prerequisites
- Node.js 18+ (or use `uv` for Python-based Node management)
- Chrome browser

### Installation

1. **Install dependencies for extension:**
```bash
cd extension
npm install
```

2. **Install dependencies for webapp:**
```bash
cd webapp
npm install
```

3. **Set up environment variables:**

Extension (.env):
```
VITE_API_BASE_URL=http://localhost:3000
# PostHog (optional)
VITE_PUBLIC_POSTHOG_KEY=your_key_here
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Webapp (.env):
```
DATABASE_URL="file:./dev.db"
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_FALLBACK_MODEL=google/gemini-2.0-flash-lite
COMPOSIO_API_KEY=your_key_here

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

4. **Initialize database:**
```bash
cd webapp
npx prisma db push
```

### Development

1. **Start the Next.js backend:**
```bash
cd webapp
npm run dev
```

2. **Build the extension:**
```bash
cd extension
npm run build
```

3. **Load extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

### Usage

#### Keyboard Shortcuts
- `Alt+J` (Windows/Linux) or `Cmd+J` (Mac) - Open command palette
- `Alt+Shift+C` - Categorize all open tabs

#### Features

**Tab Categorization:**
1. Click the AUTOME icon in your toolbar
2. Click "Categorize Tabs"
3. View organized tabs in the sidepanel

**Save Highlights:**
1. Highlight any text on a webpage
2. Click the "Save highlight" popup that appears
3. Search your highlights in the sidepanel

**Proactive Suggestions:**
- Suggestions appear automatically based on your current page
- Click "Execute" to perform the suggested action
- Click "Dismiss" to hide a suggestion

## Project Structure

```
autome/
├── extension/           # Chrome extension
│   ├── src/
│   │   ├── background/  # Service worker
│   │   ├── content/     # Content scripts
│   │   ├── services/    # Business logic
│   │   ├── state/       # Zustand stores
│   │   ├── types/       # TypeScript types
│   │   └── ui/          # React components
│   └── manifest.json
│
└── webapp/             # Next.js backend
    ├── src/
    │   └── app/
    │       └── api/     # API routes
    └── prisma/
        └── schema.prisma
```

## API Endpoints

### Extension Endpoints
- `POST /api/extension/categorize-tabs` - Categorize browser tabs
- `POST /api/extension/get-suggestions` - Get AI suggestions

### Memory Endpoints
- `POST /api/memories/save` - Save a memory
- `POST /api/memories/search` - Search memories
- `POST /api/memories/delete` - Delete a memory

## Development Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Project setup
- [x] TypeScript types
- [x] Service layer
- [x] Message routing
- [x] Basic UI components

### Phase 2: Core Features ✅
- [x] Tab categorization
- [x] Memory system
- [x] Suggestions
- [x] Command palette

### Phase 3: Use Cases (In Progress)
- [x] Email personalization
- [x] Meeting preparation
- [x] YouTube summarization
- [ ] Browser actions (safe click/type/fill with confirmation)
- [x] Email categorization
- [x] Meeting notes
- [x] Data cleaning
- [x] Research compilation
- [ ] Cross-platform sync
- [x] Resume update

### Phase 4: Integrations (Planned)
- [~] Gmail adapter (Composio wiring in place; connect/disconnect supported; requires Auth Config + account connection)
- [~] Notion adapter (Composio wiring in place; connect/disconnect supported; requires Auth Config + account connection)
- [~] Slack adapter (Composio wiring in place; connect/disconnect supported; requires Auth Config + account connection)
- [~] GitHub adapter (Composio wiring in place; connect/disconnect supported; requires Auth Config + account connection)

## Contributing

This is a personal project currently in development. Contributions welcome once the initial MVP is complete.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, Next.js, and AI

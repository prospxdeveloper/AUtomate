# AUTOME: COMPLETE FROM-SCRATCH DEVELOPMENT PLAN
## Brand New Build (NOT based on existing code)
## Ready to Feed to GitHub Copilot

---

## 📋 EXECUTIVE SUMMARY

**Building AUTOME from scratch** = Fresh codebase, all original code
- ❌ Do NOT use existing background.js
- ✅ Use competition research as prioritization input only (do not copy product text/UX)
- ✅ Build a collaborative copilot ("Cursor, not Devin") with the user in control
- ✅ Privacy-first by default (minimize data sent; make memory optional/transparent)
- ✅ Build with modern patterns (TypeScript strict, Vite, Next.js 14)
- ✅ Local PC development (SQLite, no cloud)
- ✅ Ready to deploy Monday (Vercel + GCP optional)

**Tech Stack:**
- Extension: React 18 + TypeScript + Manifest V3 + Zustand + Vite
- Backend: Next.js 14 (App Router) + Prisma + SQLite
- LLM: OpenRouter (multi-model)
- Integrations: Composio + direct APIs

**Timeline:** Friday 6 PM → Sunday 11 PM (48 hours)
**Effort:** 80% Copilot, 20% integration
**Output:** Production-ready MVP Monday

---

## 🎯 FEATURE LIST (Informed by Competition Research)

**Product guardrails (what to do / not do):**
- Build a real-time copilot that provides instant feedback and keeps the user in the loop.
- Avoid "set-and-forget" autonomous agents; no long-running background automation without clear user confirmation.
- Treat memory as optional and user-controlled (view/delete/disable); never assume persistent capture.
- Prefer browser-native signals (tabs, visible DOM, highlights) and minimal context transfer.
- Keep integrations user-initiated (connect, preview, approve) and reversible.

### **TIER 1: CORE FEATURES (MUST HAVE)**

#### **Feature 1: AI Tab Categorization** ⭐ UNIQUE
```
Use Case: "Organize all tabs. Summarize tabs on AI agents."
Flow:
1. User has 10+ tabs open
2. Extension detects tabs on-demand (button/shortcut) and optionally on a safe interval
3. Sends to OpenRouter: "Group these tabs by topic"
4. LLM returns: { tabId, category, groupId, priority }
5. Extension shows in sidepanel with visual grouping
6. User clicks group to focus those tabs

Integrations: None (browser-native)
LLM: OpenRouter (Claude or GPT-4)
Storage: IndexedDB (cache for 1 hour)
```

#### **Feature 2: Browser Memory System**
```
Use Case: "Highlight text → auto-save. Search later."
Flow:
1. User highlights text on any page
2. Content script captures: text + URL + title + timestamp
3. Extension auto-tags with keywords
4. Saves to IndexedDB
5. User can search "email" to find related highlights
6. LLM uses memories to improve suggestions

Guardrail:
- Memory is optional and user-controlled; provide clear delete/disable paths.

Methods Needed:
- captureHighlight() → extracts text + context
- saveMemory() → stores in IndexedDB
- searchMemories(query) → keyword search
- getRelevantMemories(context) → smart retrieval
- deleteOlderThan(days) → cleanup

Storage: IndexedDB 'autome-memories'
Schema: { id, content, tags, source, timestamp, embedding? }
```

#### **Feature 3: Proactive Suggestions**
```
Use Case: "Suggest next action based on current page"
Flow:
1. On page change (and/or a conservative interval): extract minimal page context
2. Retrieve relevant memories
3. Call LLM: "Here's context + memories. Suggest 1 action."
4. Show in UI corner (non-intrusive widget)
5. User clicks to execute (with confirmation/preview where needed) or dismiss

Example Suggestions:
- Gmail draft page → "Draft personalized follow-up?"
- Slack message → "Create task from this?"

LLM: OpenRouter (Claude for reasoning)
Frequency: Every 2 seconds or on page change
Display: Bottom-right widget, auto-dismiss after 10s
```

#### **Feature 4: Command Palette** (Cmd+J / Alt+J)
```
Use Case: "Quick access to all suggestions, memories, actions"
Flow:
1. User presses Cmd+J (Mac) or Alt+J (Windows)
2. Modal opens with search box
3. User types: "email", "meetings", "monday"
4. Results show:
   - Matching suggestions
   - Matching memories (highlights)
   - Matching use cases
5. Select and execute with Enter

UI:
- Spotlight-like design
- Fuzzy search (fuse.js library)
- Keyboard navigation (arrow keys)
- Escape to close
```

### **TIER 2: USE CASES (Top 10 Workflows to Ship First)**

Principle:
- These are guided workflows (copilot-style). Prefer preview + explicit user approval for any external side effects (sending emails, posting messages, writing to docs).

#### **Use Case 1: Email Personalization**
```
Trigger: "Send personalized emails to whole list"
Required Integrations: Gmail
Flow:
1. User provides recipient list (manual input)
2. For each recipient:
   a. Pull relevant context (if available)
   b. Call LLM: "Draft personalized intro for [name] at [company]"
   c. Generate email draft
   d. User reviews + approves or edits
   e. Send via Gmail
3. Track sent emails in database
4. Log to memory for future reference

Copilot Prompts Needed:
- Gmail draft + send API
- LLM prompt engineering for personalization
- Email tracking
```

#### **Use Case 2: Meeting Preparation**
```
Trigger: "Prepare for meetings today"
Required Integrations: Gmail
Flow:
1. User provides meeting context (notes/agenda)
2. Search Gmail for relevant past threads (optional)
3. Call LLM: "Generate 1-page meeting brief with talking points"
4. Show brief in modal

Copilot Prompts Needed:
- Gmail thread retrieval
- Multi-source data aggregation
- LLM prompt for meeting briefs
```

#### **Use Case 3: YouTube Video Summarization**
```
Trigger: "Summarize video. Retain key details and takeaways."
Required Integrations: YouTube (transcript + frames)
Flow:
1. User on YouTube video page
2. Extension detects video URL
3. Fetch YouTube transcript (or auto-caption)
4. Capture key frames (every 30 seconds)
5. Call OpenRouter with multimodal:
   - Input: video transcript + 5 key frames + video title
   - Model: GPT-4o (multimodal support)
   - Output: { summary, keyTakeaways, timestamps, visuals }
6. Save summary to memory
7. User can export or share

Copilot Prompts Needed:
- YouTube API or transcript extraction
- Frame capture from video player
- Multimodal LLM prompting
- Timestamp linking
```

#### **Use Case 4: Email Categorization & Labeling**
```
Trigger: "Label my emails: urgent/medium/low, work/personal/spam"
Required Integrations: Gmail
Flow:
1. User command: "Categorize emails from last week"
2. Fetch emails from past 7 days (Gmail API)
3. For each email:
   a. Extract: subject, sender, body snippet, metadata
   b. Call LLM: "Classify as urgent/medium/low AND work/personal/spam"
   c. LLM returns: { urgency, category, confidence }
4. Apply labels in Gmail:
   - Create/apply labels
   - Archive if low priority
   - Snooze if needed
5. Log categorization in memory
6. Build user preference model (optional)

Copilot Prompts Needed:
- Gmail API email retrieval
- Batch processing (handle 100+ emails)
- LLM classification with confidence
- Gmail label management API
- Async job handling
```

#### **Use Case 6: Meeting Notes → Action Items**
```
Trigger: "Summarize meeting, extract todos, draft follow-up email"
Required Integrations: Gmail + Notion + Google Docs
Flow:
1. User in Google Meet or Zoom (after recording)
2. Extension: "Process this meeting?"
3. Input: meeting recording URL or transcript
4. Extract meeting data:
   - Participants (if available)
   - Duration, date, topic
   - Transcript (auto-caption or upload)
5. Call LLM: "Generate: 1) meeting summary 2) action items 3) follow-up email"
6. Output:
   - Summary paragraph
   - Action items list with owners
   - Draft follow-up email
7. Create Notion page with notes
8. Auto-draft Gmail follow-up
9. Create Google Doc with full notes

Copilot Prompts Needed:
- Recording/transcript processing
- Meeting data extraction
- Multi-output LLM prompting
- Notion page creation API
- Google Docs API
- Gmail draft generation
```

#### **Use Case 7: Data Cleaning & Interpretation**
```
Trigger: "Clean this up" (user selects messy data)
Required Integrations: None (local processing)
Flow:
1. User highlights messy CSV or table data
2. Extension captures data
3. Call LLM: "Clean this data. Fix formatting, standardize entries, remove duplicates"
4. LLM returns: clean data (same format)
5. User can:
   - View before/after
   - Copy cleaned data
   - Save to Google Sheet
   - Export as CSV

Advanced Version:
- "Evaluate this candidate" (with custom evaluation criteria)
- "Score this lead" (with scoring rubric)
- "Analyze this dataset" (with specific questions)

Copilot Prompts Needed:
- Data parsing and validation
- LLM structured output (JSON format)
- Before/after comparison UI
- Data export to multiple formats
```

#### **Use Case 8: Tab-Based Research Compilation**
```
Trigger: "Organize all tabs. Create research outline in Google Docs"
Required Integrations: Google Docs + Browser tabs
Flow:
1. User has 8 tabs on "AI agents" topic (scattered research)
2. Extension command: "Compile research outline"
3. Extract from each tab:
   - Title, URL, key text (user-highlighted)
   - Content snippet
   - Relevance score
4. Call LLM: "Create research outline from these sources"
5. LLM generates structure:
   - I. Introduction
   - II. Types of AI Agents
   - III. Use Cases
   - IV. Technical Implementation
   - V. Challenges
   - VI. Future Directions
6. Create Google Doc with:
   - Outline structure
   - Citations linking to original tabs
   - Suggested reading order
7. User can click citation to jump to tab

Copilot Prompts Needed:
- Tab content extraction
- Research structure generation
- Google Docs API with links
- Citation formatting
```

#### **Use Case 9: GitHub/Jira/Linear Cross-Platform Sync**
```
Trigger: "Create issue and PR on backend. Update Jira and Linear"
Required Integrations: GitHub + Jira + Linear
Flow:
1. User in Slack: "backend data storage broken"
2. Extension extracts context
3. Create GitHub issue:
   - Title: "[BUG] Data storage broken"
   - Description: context from Slack
   - Labels: backend, bug
4. Create GitHub PR draft (if code available)
5. Create Jira issue (same data)
6. Create Linear issue (same data)
7. Link all 3 together
8. Notify team in Slack with links

Advanced:
- "Track bugs posted in Slack" → auto-create in all platforms
- "Update Jira when GitHub PR merged" → auto-sync

Copilot Prompts Needed:
- Slack message parsing
- Multi-platform API integration
- Issue creation and linking
- Notification system
```

#### **Use Case 10: Resume Auto-Update from Slack/Drive**
```
Trigger: "Update resume with recent accomplishments"
Required Integrations: Google Drive (Resume Doc) + Slack + Gmail
Flow:
1. User command: "Update my resume with recent work"
2. Fetch from:
   - Recent Slack messages (from user + team)
   - Recent emails (accomplishments, feedback)
   - Recent Google Drive docs (projects)
3. Extract accomplishments:
   - Quantified results ("Increased X by 50%")
   - Project completions
   - Awards or recognition
4. Call LLM: "Rewrite resume experience section to include these accomplishments"
5. Update Google Doc resume:
   - New bullet points
   - Quantified impact
   - Latest company/title
6. Keep version history

Copilot Prompts Needed:
- Multi-source data aggregation
- LLM resume writing
- Google Docs update API
- Version control
```

---

## 🏗️ FRESH ARCHITECTURE (Completely New)

### **Separation of Concerns**

```
┌─────────────────────────────────────────────┐
│     PRESENTATION LAYER (React)              │
│  ├─ Sidepanel.tsx (main UI)                 │
│  ├─ Popup.tsx (icon click)                  │
│  ├─ CommandPalette.tsx (Cmd+J)              │
│  └─ Widgets (suggestions, notifications)    │
│                                             │
│  → Responsibility: Display only            │
│  → No business logic                       │
└──────────────────┬──────────────────────────┘
                   ↓ (messages)
┌─────────────────────────────────────────────┐
│    MESSAGE LAYER (Type-safe routing)        │
│  ├─ Message types (50+ types)               │
│  ├─ MessageRouter (routes to handlers)      │
│  ├─ Type-safe payload mapping               │
│  └─ Middleware (auth, validation)           │
│                                             │
│  → Responsibility: Route messages only     │
│  → No implementation logic                 │
└──────────────────┬──────────────────────────┘
                   ↓ (calls services)
┌─────────────────────────────────────────────┐
│     SERVICE LAYER (Business Logic)          │
│  ├─ TabService (categorization logic)       │
│  ├─ MemoryService (save, search, filter)    │
│  ├─ SuggestionService (AI suggestions)      │
│  ├─ UseCaseService (execute workflows)      │
│  ├─ IntegrationService (manages adapters)   │
│  └─ LLMService (OpenRouter calls)           │
│                                             │
│  → Responsibility: Pure business logic     │
│  → Testable, reusable                      │
└──────────────────┬──────────────────────────┘
                   ↓ (reads/writes)
┌─────────────────────────────────────────────┐
│    PERSISTENCE LAYER (Data Storage)         │
│  ├─ IndexedDB (local memories)              │
│  ├─ Chrome Storage (config, cache)          │
│  ├─ Backend API (memories, integrations)    │
│  └─ File system (backups, exports)          │
│                                             │
│  → Responsibility: Data durability         │
│  → Handle offline scenarios                │
└─────────────────────────────────────────────┘
```

### **Data Flow Pattern (All Features Follow This)**

```
┌────────────────────┐
│   USER ACTION      │
│  (click, highlight)│
└─────────┬──────────┘
          ↓
┌────────────────────────────────┐
│ CONTENT SCRIPT CAPTURES         │
│ (tabService.captureContext)    │
└─────────┬──────────────────────┘
          ↓
┌────────────────────────────────┐
│ SEND MESSAGE TO SERVICE WORKER  │
│ ({ type, payload })            │
└─────────┬──────────────────────┘
          ↓
┌────────────────────────────────┐
│ MESSAGE ROUTER                  │
│ (route to correct handler)      │
└─────────┬──────────────────────┘
          ↓
┌────────────────────────────────┐
│ HANDLER EXECUTES                │
│ (call services, APIs)           │
└─────────┬──────────────────────┘
          ↓
┌────────────────────────────────┐
│ SAVE TO STORAGE + SEND RESPONSE │
│ (IndexedDB + local state)       │
└─────────┬──────────────────────┘
          ↓
┌────────────────────────────────┐
│ UI UPDATES (React re-render)    │
│ (show results to user)          │
└────────────────────────────────┘
```

---

## 📁 COMPLETE FOLDER STRUCTURE (From Scratch)

```
autome/
│
├── extension/                           # Chrome Extension (Vite + React)
│   ├── src/
│   │   ├── main.tsx                     # Entry point
│   │   ├── App.tsx                      # Root component
│   │   │
│   │   ├── background/
│   │   │   ├── background.ts            # Service worker (FRESH CODE)
│   │   │   ├── messageRouter.ts         # Route messages to handlers
│   │   │   └── handlers/
│   │   │       ├── tabHandler.ts
│   │   │       ├── memoryHandler.ts
│   │   │       ├── suggestionHandler.ts
│   │   │       ├── useCaseHandler.ts
│   │   │       └── integrationHandler.ts
│   │   │
│   │   ├── content/
│   │   │   ├── content.ts               # Content script injected into pages
│   │   │   ├── injector.ts              # Safe script injection
│   │   │   └── contextExtractor.ts      # Extract page context
│   │   │
│   │   ├── services/
│   │   │   ├── TabService.ts            # Tab categorization logic
│   │   │   ├── MemoryService.ts         # Memory CRUD + search
│   │   │   ├── SuggestionService.ts     # Generate suggestions
│   │   │   ├── UseCaseService.ts        # Execute use case workflows
│   │   │   ├── IntegrationService.ts    # Manage integrations
│   │   │   ├── LLMService.ts            # Call OpenRouter
│   │   │   ├── APIClient.ts             # HTTP client to Next.js backend
│   │   │   └── StorageService.ts        # IndexedDB abstraction
│   │   │
│   │   ├── adapters/                    # Integration adapters (MVP)
│   │   │   ├── GmailAdapter.ts          # Gmail API
│   │   │   ├── NotionAdapter.ts         # Notion API
│   │   │   ├── SlackAdapter.ts          # Slack API
│   │   │   ├── GitHubAdapter.ts         # GitHub API
│   │   │   
│   │   │
│   │   ├── ui/
│   │   │   ├── sidepanel/
│   │   │   │   ├── Sidepanel.tsx        # Main UI container
│   │   │   │   ├── TabCategorizer.tsx   # Show grouped tabs
│   │   │   │   ├── MemoryBrowser.tsx    # Search memories
│   │   │   │   ├── SuggestionBox.tsx    # Show 1-2 suggestions
│   │   │   │   └── UseCaseGallery.tsx   # Quick action buttons
│   │   │   ├── popup/
│   │   │   │   └── Popup.tsx            # Icon click popup
│   │   │   ├── command-palette/
│   │   │   │   └── CommandPalette.tsx   # Cmd+J modal
│   │   │   ├── widgets/
│   │   │   │   ├── SuggestionWidget.tsx # Floating widget
│   │   │   │   ├── NotificationWidget.tsx
│   │   │   │   └── ProgressWidget.tsx   # Loading/progress
│   │   │   └── shared/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Card.tsx
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts                 # All TypeScript types
│   │   │   ├── messages.ts              # Message type definitions
│   │   │   ├── usecases.ts              # Use case types
│   │   │   ├── integrations.ts          # Integration types
│   │   │   ├── llm.ts                   # LLM response types
│   │   │   └── domain.ts                # Business domain types
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMessage.ts            # Send messages to background
│   │   │   ├── useMemory.ts             # Query memories
│   │   │   ├── useTabs.ts               # Get tab state
│   │   │   ├── useSuggestions.ts        # Get suggestions
│   │   │   └── useCommandPalette.ts     # Command palette state
│   │   │
│   │   ├── state/                       # Zustand stores
│   │   │   ├── tabStore.ts              # Tab state
│   │   │   ├── memoryStore.ts           # Memory state
│   │   │   ├── suggestionStore.ts       # Suggestion state
│   │   │   ├── uiStore.ts               # UI state
│   │   │   └── appStore.ts              # Global app state
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css              # Tailwind + custom
│   │   │   ├── animations.css           # Transitions
│   │   │   └── dark-mode.css            # Dark theme
│   │   │
│   │   └── utils/
│   │       ├── logger.ts                # Logging utility
│   │       ├── errorHandler.ts          # Error handling
│   │       ├── validators.ts            # Input validation
│   │       └── helpers.ts               # Utility functions
│   │
│   ├── public/
│   │   ├── icons/
│   │   │   ├── icon-16.png
│   │   │   ├── icon-48.png
│   │   │   └── icon-128.png
│   │   └── sidepanel.html               # Sidepanel entry point
│   │
│   ├── manifest.json                    # Chrome extension manifest v3
│   ├── vite.config.ts                   # Vite config with @crxjs plugin
│   ├── tsconfig.json                    # TypeScript config (strict)
│   ├── tailwind.config.js               # Tailwind CSS config
│   └── package.json
│
├── webapp/                              # Next.js 14 Backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx               # Root layout
│   │   │   ├── page.tsx                 # Dashboard page
│   │   │   ├── globals.css              # Global styles
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── extension/           # Extension → Next.js endpoints
│   │   │   │   │   ├── categorize-tabs/route.ts
│   │   │   │   │   ├── get-suggestions/route.ts
│   │   │   │   │   ├── suggest-action/route.ts
│   │   │   │   │   └── execute-usecase/route.ts
│   │   │   │   │
│   │   │   │   ├── memories/            # Memory API
│   │   │   │   │   ├── save/route.ts
│   │   │   │   │   ├── search/route.ts
│   │   │   │   │   ├── list/route.ts
│   │   │   │   │   └── delete/route.ts
│   │   │   │   │
│   │   │   │   ├── usecases/            # Use case execution
│   │   │   │   │   ├── email-personalize/route.ts
│   │   │   │   │   ├── meeting-prep/route.ts
│   │   │   │   │   ├── video-summarize/route.ts
│   │   │   │   │
│   │   │   │   │   └── ... (8+ more)
│   │   │   │   │
│   │   │   │   └── integrations/        # Integration management
│   │   │   │       ├── connect/route.ts
│   │   │       ├── disconnect/route.ts
│   │   │       └── status/route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── IntegrationMarketplace.tsx
│   │   │   ├── MemoryViewer.tsx
│   │   │   ├── UseCaseGallery.tsx
│   │   │   └── ParagonWorkflowBuilder.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── openrouter.ts            # OpenRouter client (FRESH)
│   │   │   ├── integrations/            # Integration orchestration
│   │   │   │   ├── GmailService.ts
│   │   │   │
│   │   │   │   ├── NotionService.ts
│   │   │   │   ├── SlackService.ts
│   │   │   │   ├── GitHubService.ts
│   │   │   │
│   │   │   ├── usecases/                # Use case implementations
│   │   │   │   ├── emailPersonalization.ts
│   │   │   │   ├── meetingPreparation.ts
│   │   │   │   ├── videoSummarization.ts
│   │   │   │
│   │   │   │   └── ... (6+ more)
│   │   │   ├── llm.ts                   # LLM orchestration
│   │   │   └── workflow.ts              # Workflow engine
│   │   │
│   │   ├── lib/
│   │   │   ├── db.ts                    # Prisma client
│   │   │   ├── validators.ts            # Zod schemas
│   │   │   ├── errors.ts                # Error handling
│   │   │   ├── logging.ts               # Logging setup
│   │   │   └── constants.ts             # App constants
│   │   │
│   │   └── middleware.ts                # NextAuth, CORS, etc
│   │
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema (FRESH)
│   │   └── migrations/
│   │
│   ├── .env.local                       # Local env vars
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── package.json
│
├── shared/                              # Shared TypeScript types
│   ├── types/
│   │   ├── index.ts                     # All types
│   │   ├── messages.ts                  # Message types
│   │   ├── usecases.ts                  # Use case types
│   │   ├── integrations.ts              # Integration types
│   │   └── domain.ts                    # Domain types
│   └── constants/
│       ├── usecases.ts
│       ├── integrations.ts
│       └── models.ts                    # OpenRouter models
│
├── docs/
│   ├── ARCHITECTURE.md                  # System design
│   ├── SETUP.md                         # Local dev setup
│   ├── USE_CASES.md                     # Feature documentation
│   ├── API.md                           # API reference
│   ├── DEPLOYMENT.md                    # Deploy to GCP/AWS
│   └── DEPLOYMENT_CHECKLIST.md          # Pre-launch checklist
│
├── .gitignore
├── .env.example
├── README.md
├── package.json                         # Root monorepo
└── DEVELOPMENT_PLAN.md                  # This file
```

---

## 🛠️ COMPLETE TYPESCRIPT TYPES (Generate From Scratch)

### **Message Types (50+ Types)**

```typescript
// shared/types/messages.ts

export enum MessageType {
  // Tab Operations
  CATEGORIZE_TABS = 'CATEGORIZE_TABS',
  GET_TAB_CONTEXT = 'GET_TAB_CONTEXT',
  
  // Memory Operations
  SAVE_MEMORY = 'SAVE_MEMORY',
  SEARCH_MEMORIES = 'SEARCH_MEMORIES',
  GET_MEMORY = 'GET_MEMORY',
  DELETE_MEMORY = 'DELETE_MEMORY',
  
  // Suggestions
  GET_SUGGESTIONS = 'GET_SUGGESTIONS',
  DISMISS_SUGGESTION = 'DISMISS_SUGGESTION',
  
  // Use Cases
  EXECUTE_USECASE = 'EXECUTE_USECASE',
  GET_USECASES_FOR_PAGE = 'GET_USECASES_FOR_PAGE',
  
  // Integrations
  CONNECT_INTEGRATION = 'CONNECT_INTEGRATION',
  DISCONNECT_INTEGRATION = 'DISCONNECT_INTEGRATION',
  GET_INTEGRATION_STATUS = 'GET_INTEGRATION_STATUS',
  
  // Storage
  SYNC_TO_BACKEND = 'SYNC_TO_BACKEND',
  EXPORT_MEMORIES = 'EXPORT_MEMORIES',
  
  // UI
  SHOW_COMMAND_PALETTE = 'SHOW_COMMAND_PALETTE',
  NAVIGATE_TO_TAB = 'NAVIGATE_TO_TAB',
  
  // Analytics
  LOG_ACTION = 'LOG_ACTION',
  TRACK_FEATURE_USAGE = 'TRACK_FEATURE_USAGE'
}

// Type-safe payload & response mapping
export type PayloadFor<T extends MessageType> = 
  T extends MessageType.CATEGORIZE_TABS ? { tabs: BrowserTab[] } :
  T extends MessageType.SAVE_MEMORY ? { content: string; source: PageSource } :
  T extends MessageType.SEARCH_MEMORIES ? { query: string; limit?: number } :
  T extends MessageType.EXECUTE_USECASE ? { useCaseName: string; params: any } :
  never;

export type ResponseFor<T extends MessageType> =
  T extends MessageType.CATEGORIZE_TABS ? { categorized: CategorizedTab[] } :
  T extends MessageType.SAVE_MEMORY ? { id: string; success: boolean } :
  T extends MessageType.SEARCH_MEMORIES ? { memories: Memory[] } :
  T extends MessageType.EXECUTE_USECASE ? { success: boolean; result: any } :
  never;

// All domain types
export interface BrowserTab {
  id: number;
  url: string;
  title: string;
  faviconUrl?: string;
  lastAccessed: number;
}

export interface CategorizedTab extends BrowserTab {
  category: string;
  groupId: string;
  priority: 'high' | 'medium' | 'low';
  relatedTabs?: number[];
}

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  source: PageSource;
  timestamp: number;
  embedding?: number[];
  category?: string;
}

export interface PageSource {
  url: string;
  title: string;
  favicon?: string;
  context?: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  icon: string;
  reasoning: string;
  useCaseName?: string;
}

export interface UseCase {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'research' | 'productivity' | 'engineering' | 'other';
  requiredIntegrations: string[];
  trigger: string;
  handler: string;
  priority: number;
}

export interface Integration {
  provider: string; // 'gmail', 'notion', 'slack', 'github', etc
  name: string;
  connected: boolean;
  accessToken?: string;
  scopes: string[];
  connectedAt?: number;
  expiresAt?: number;
}
```

---

## 📊 COMPLETE PRISMA SCHEMA (Fresh Database Design)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String      @id @default(cuid())
  email             String      @unique
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  // Relations
  memories          Memory[]
  useCaseLogs       UseCaseLog[]
  integrations      Integration[]
  preferences       Preferences?
  
  @@index([email])
}

model Memory {
  id                String      @id @default(cuid())
  userId            String
  content           String      @db.Text
  tags              String      // JSON stringified
  source            String      // JSON: { url, title, context }
  category          String?
  embedding         String?     // JSON stringified array
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  accessedAt        DateTime    @updatedAt
  
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([category])
  @@index([createdAt])
}

model UseCaseLog {
  id                String      @id @default(cuid())
  userId            String
  useCaseName       String
  
  inputData         String      @db.Text // JSON
  outputData        String?     @db.Text // JSON
  status            String      // 'success', 'error', 'pending'
  errorMessage      String?
  
  integrationUsed   String?
  duration          Int?        // milliseconds
  
  createdAt         DateTime    @default(now())
  
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([useCaseName])
  @@index([createdAt])
}

model Integration {
  id                String      @id @default(cuid())
  userId            String
  provider          String      // 'gmail', 'notion', 'slack', 'github', etc
  
  accessToken       String      @db.Text
  refreshToken      String?     @db.Text
  expiresAt         DateTime?
  scopes            String      // JSON stringified
  
  metadata          String?     @db.Text // JSON
  
  connectedAt       DateTime    @default(now())
  disconnectedAt    DateTime?
  lastUsedAt        DateTime?
  
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, provider])
  @@index([userId])
  @@index([provider])
}

model Preferences {
  id                String      @id @default(cuid())
  userId            String      @unique
  
  // UI Preferences
  theme             String      @default("system") // 'light', 'dark', 'system'
  sidebarPosition   String      @default("right")
  suggestionFreq    Int         @default(2000) // milliseconds
  
  // Feature Toggles
  memoriesEnabled   Boolean     @default(true)
  suggestionsEnabled Boolean    @default(true)
  tabCategoryEnabled Boolean    @default(true)
  
  // Privacy
  analyticsEnabled  Boolean     @default(false)
  cloudSyncEnabled  Boolean     @default(false)
  
  updatedAt         DateTime    @updatedAt
  
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model TabSession {
  id                String      @id @default(cuid())
  
  tabs              String      @db.Text // JSON array
  categorization    String?     @db.Text // JSON
  summary           String?     @db.Text
  
  createdAt         DateTime    @default(now())
  
  @@index([createdAt])
}
```

---

## 🤖 COPILOT-READY PHASE BREAKDOWN

This is exactly what you'll feed to Copilot each day.

### **FRIDAY EVENING: Phase 1 (6 hours)**

#### **Phase 1A: Complete Project Initialization (2 hours)**

**Step 1: Copilot Prompt 1.1**
```
Create fresh monorepo initialization for AUTOME browser extension.

Commands to run:
```bash
mkdir autome && cd autome
git init
git config user.email "dev@autome.app"
git config user.name "AUTOME Builder"

# Create folder structure
mkdir -p extension webapp shared/{types,constants} docs

# Extension: Vite + React + TypeScript + @crxjs
npm create vite@latest extension -- --template react-ts
cd extension
npm install -D @crxjs/vite-plugin zustand fuse.js
npm install axios zustand fuse.js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
cd ..

# Webapp: Next.js 14
npx create-next-app@latest webapp --typescript --tailwind --app --eslint
cd webapp
npm install zustand prisma @prisma/client axios
npm install -D prisma
npx prisma init
cd ..

# Root package.json
npm init -y

# Git first commit
git add .
git commit -m "Initial: Fresh monorepo structure (AUTOME v1)"
```

**Output Expected:**
- ✅ ext folder structure
- ✅ webapp created with Next.js defaults
- ✅ All packages installed
- ✅ First git commit
```

**Step 2: Copilot Prompt 1.2**
```
Set up environment files for AUTOME development.

Create extension/.env.local:
───────────────────────────
VITE_API_BASE=http://localhost:3000
VITE_OPENROUTER_API_KEY=sk-or-YOUR_KEY_HERE
VITE_COMPOSIO_API_KEY=YOUR_KEY_HERE
VITE_ENVIRONMENT=development

Create webapp/.env.local:
───────────────────────
OPENROUTER_API_KEY=sk-or-YOUR_KEY_HERE
COMPOSIO_API_KEY=YOUR_KEY_HERE
DATABASE_URL="file:./autome.db"
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_SECRET=generated-secret-key-here
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development

Create webapp/prisma/.env (same as webapp/.env.local):
────────────────────────────────────────────────────
DATABASE_URL="file:../autome.db"

Instructions for getting keys:
1. OpenRouter: Go to https://openrouter.ai
   - Sign up (free)
   - Copy API key
   - Paste into VITE_OPENROUTER_API_KEY

2. (Removed) Paragon: legacy from earlier plan
   - Sign up (free trial)
   - Create project
   - Copy project ID

3. Generate NEXTAUTH_SECRET:
   openssl rand -base64 32
```

**Step 3: Copilot Prompt 1.3**
```
Create Tailwind CSS configuration for AUTOME with dark mode.

File: extension/tailwind.config.js
─────────────────────────────────
Generate complete Tailwind config with:
- Dark mode: class strategy
- Custom colors: autome brand colors (teal, blue, orange)
- Custom spacing, fonts, shadows
- Extend plugins for animations

File: extension/postcss.config.js
──────────────────────────────
Generate PostCSS config for Tailwind

File: extension/src/styles/globals.css
──────────────────────────────────────
Generate global CSS with:
- Tailwind directives
- Dark mode CSS variables
- Custom animations (fade-in, slide-in, pulse)
- Scrollbar styling
- Font imports

Same for webapp/tailwind.config.js and webapp/src/globals.css
```

#### **Phase 1B: Complete TypeScript Types (1.5 hours)**

**Step 4: Copilot Prompt 1.4**
```
Create complete TypeScript type definitions for AUTOME.

File: shared/types/index.ts
──────────────────────────

Generate all types with:

1. Message Types:
   enum MessageType with 40+ types:
   - Tab operations (CATEGORIZE_TABS, GET_TAB_CONTEXT, etc)
   - Memory operations (SAVE_MEMORY, SEARCH_MEMORIES, etc)
   - Suggestions (GET_SUGGESTIONS, DISMISS_SUGGESTION)
   - Use cases (EXECUTE_USECASE, GET_USECASES_FOR_PAGE)
   - Integrations (CONNECT, DISCONNECT, STATUS)
   - Storage (SYNC_TO_BACKEND, EXPORT_MEMORIES)
   - UI (SHOW_COMMAND_PALETTE, NAVIGATE_TO_TAB)
   - Analytics (LOG_ACTION, TRACK_FEATURE_USAGE)

2. Type-safe Payload & Response mapping:
   PayloadFor<T extends MessageType>: Maps each type to payload
   ResponseFor<T extends MessageType>: Maps each type to response
   Example:
     CATEGORIZE_TABS → { tabs: BrowserTab[] } → { categorized: CategorizedTab[] }
     SAVE_MEMORY → { content, source } → { id, success }

3. Domain Types:
   - BrowserTab { id, url, title, faviconUrl, lastAccessed }
   - CategorizedTab extends BrowserTab + { category, groupId, priority, relatedTabs }
   - Memory { id, content, tags, source, timestamp, embedding?, category? }
   - PageSource { url, title, favicon?, context? }
   - Suggestion { id, title, description, action, icon, reasoning, useCaseName? }
   - UseCase { id, name, description, category, requiredIntegrations, trigger, handler, priority }
   - Integration { provider, name, connected, accessToken?, scopes, connectedAt?, expiresAt? }

4. Use Case Types:
   interface UseCaseInput { ... }
   interface UseCaseOutput { ... }
   type UseCaseHandler = (input) => Promise<output>

5. LLM Types:
   interface OpenRouterRequest { model, messages, temperature, max_tokens }
   interface OpenRouterResponse { choices, usage, model }
   enum OpenRouterModel { CLAUDE, GPT4O, DEEPSEEK, etc }

All types with strict null checks, no 'any', exported for use everywhere.
```

**Step 5: Copilot Prompt 1.5**
```
Create message type definitions file.

File: shared/types/messages.ts
─────────────────────────────

Define:

1. Message<T extends MessageType> interface:
   {
     type: T,
     payload: PayloadFor<T>,
     messageId: string,
     timestamp: number
   }

2. MessageResponse<T> interface:
   {
     type: T,
     success: boolean,
     data?: ResponseFor<T>,
     error?: {
       code: string,
       message: string,
       details?: any
     }
   }

3. MessageRouter types:
   type Handler<T extends MessageType> = (
     payload: PayloadFor<T>
   ) => Promise<ResponseFor<T>>

   type MessageHandlers = {
     [K in MessageType]: Handler<K>
   }

4. Export all message-related types
```

#### **Phase 1C: Folder & Git Setup (1.5 hours)**

**Step 6: Copilot Prompt 1.6**
```
Create complete folder structure with placeholder files.

For extension/:
  background/
    - background.ts (Service worker - empty but with JSDoc)
    - messageRouter.ts (Router class - stub)
    - handlers/
      - tabHandler.ts
      - memoryHandler.ts
      - suggestionHandler.ts
      - useCaseHandler.ts
      - integrationHandler.ts
  
  content/
    - content.ts (Content script - stub)
    - injector.ts (Script injection - stub)
    - contextExtractor.ts (Context extraction - stub)
  
  services/
    - TabService.ts (class - stub)
    - MemoryService.ts (class - stub)
    - SuggestionService.ts (class - stub)
    - UseCaseService.ts (class - stub)
    - IntegrationService.ts (class - stub)
    - LLMService.ts (class - stub)
    - APIClient.ts (HTTP client - stub)
    - StorageService.ts (IndexedDB wrapper - stub)
  
  adapters/
    - GmailAdapter.ts (interface + stub)
    - NotionAdapter.ts
    - SlackAdapter.ts
    - GitHubAdapter.ts
  
  ui/
    - sidepanel/
      - Sidepanel.tsx (React.FC - stub)
      - TabCategorizer.tsx
      - MemoryBrowser.tsx
      - SuggestionBox.tsx
      - UseCaseGallery.tsx
    - popup/
      - Popup.tsx
    - command-palette/
      - CommandPalette.tsx
    - widgets/
      - SuggestionWidget.tsx
      - NotificationWidget.tsx
      - ProgressWidget.tsx
    - shared/
      - Button.tsx
      - Input.tsx
      - Modal.tsx
      - Card.tsx
  
  types/
    - index.ts (MAIN - already created)
    - messages.ts (MAIN - already created)
    - usecases.ts
    - integrations.ts
    - llm.ts
    - domain.ts
  
  hooks/
    - useMessage.ts
    - useMemory.ts
    - useTabs.ts
    - useSuggestions.ts
    - useCommandPalette.ts
  
  state/
    - tabStore.ts
    - memoryStore.ts
    - suggestionStore.ts
    - uiStore.ts
    - appStore.ts
  
  utils/
    - logger.ts
    - errorHandler.ts
    - validators.ts
    - helpers.ts

For webapp/:
  app/
    - api/
      - extension/
        - categorize-tabs/route.ts
        - get-suggestions/route.ts
        - suggest-action/route.ts
        - execute-usecase/route.ts
      - memories/
        - save/route.ts
        - search/route.ts
        - list/route.ts
        - delete/route.ts
      - usecases/
        - email-personalize/route.ts
        - meeting-prep/route.ts
        - video-summarize/route.ts
        - email-categorize/route.ts
        - meeting-notes-summary/route.ts
        - data-cleaning/route.ts
        - tab-research-compile/route.ts
        - issue-sync/route.ts
        - resume-update/route.ts
      - integrations/
        - connect/route.ts
        - disconnect/route.ts
        - status/route.ts
    - components/
      - Dashboard.tsx
      - IntegrationMarketplace.tsx
      - MemoryViewer.tsx
      - UseCaseGallery.tsx
      - ParagonWorkflowBuilder.tsx
    - services/
      - openrouter.ts
      - integrations/
        - GmailService.ts
        - NotionService.ts
        - SlackService.ts
        - GitHubService.ts
      - usecases/
        - emailPersonalization.ts
        - meetingPreparation.ts
        - videoSummarization.ts
        - emailCategorization.ts
        - meetingNotesSummary.ts
        - dataCleaning.ts
        - tabResearchCompile.ts
        - issueSync.ts
        - resumeUpdate.ts
    - lib/
      - db.ts
      - validators.ts
      - errors.ts
      - logging.ts
      - constants.ts
  - middleware.ts

For shared/:
  - types/index.ts ✅ (DONE)
  - types/messages.ts ✅ (DONE)
  - types/usecases.ts
  - types/integrations.ts
  - types/llm.ts
  - types/domain.ts
  - constants/usecases.ts
  - constants/integrations.ts
  - constants/models.ts

For docs/:
  - ARCHITECTURE.md (empty)
  - SETUP.md (empty)
  - USE_CASES.md (empty)
  - API.md (empty)
  - DEPLOYMENT.md (empty)
  - DEPLOYMENT_CHECKLIST.md (empty)

Each file should have:
  - JSDoc comment explaining purpose
  - Empty/stub implementation
  - Import statements prepared
  - Ready for Copilot to fill in
```

**Step 7: Copilot Prompt 1.7**
```
Create Chrome extension manifest.json (Manifest V3).

File: extension/manifest.json

Generate complete manifest with:

1. Metadata:
   - name: "AUTOME"
   - version: "0.1.0"
   - description: "AI-powered browser assistant for productivity"
   - author: "AUTOME Team"

2. Permissions:
   - tabs (read tab info)
   - storage (store locally)
   - webRequest (intercept requests - if needed)
   - scripting (inject scripts)
   - runtime (messaging)

3. Host Permissions:
   - <all_urls> (run on all sites)

4. Background Service Worker:
   - service_worker: "src/background.ts"
   - type: "module"

5. Content Scripts:
   - matches: ["<all_urls>"]
   - js: ["src/content.ts"]
   - run_at: "document_start"

6. Sidepanel:
   - default_path: "src/sidepanel.html"
   - default_title: "AUTOME"

7. Popup:
   - default_popup: "src/popup.html"
   - default_title: "AUTOME Quick Access"

8. Icons:
   - 16: "public/icons/icon-16.png"
   - 48: "public/icons/icon-48.png"
   - 128: "public/icons/icon-128.png"

9. Web Accessible Resources:
   - resources needed for Paragon SDK

10. Commands:
    - "open-command-palette": Cmd+J (Mac) / Alt+J (Windows)
    - description: "Open AUTOME Command Palette"

11. Content Security Policy:
    - script-src: 'self', 'wasm-unsafe-eval'
  - connect-src: 'self', https://openrouter.ai

12. Microphone/Camera Permissions (for meeting recordings):
    - permissions: ["microphone", "camera"] (optional)

13. Cross-origin Requests:
  - host_permissions: for Gmail, Notion, Slack, GitHub, etc.

Make sure it follows Manifest V3 standards.
```

**Step 8: Final Friday Commit**
```bash
git add .
git commit -m "Phase 1 Complete: Project setup + types + folder structure

- ✅ Monorepo initialized (extension + webapp + shared)
- ✅ All TypeScript types defined (50+ message types)
- ✅ Folder structure created (all files stubbed)
- ✅ Tailwind CSS configured (dark mode ready)
- ✅ Environment files created
- ✅ Manifest.json ready
- ✅ Ready for Phase 2: Service implementation"
```

---

### **SATURDAY MORNING: Phase 2 (4 hours - Core Extension Logic)**

[Phase 2-6 follows same pattern: Copilot prompts numbered 2.1, 2.2, ... 6.5]

---

**Due to length, here's the pattern for Saturday-Sunday:**

#### **SATURDAY (14 hours total)**

**Morning (4 hours):**
- Prompts 2.1-2.4: Service implementation (Tab, Memory, Suggestion, LLM)

**Afternoon (5 hours):**
- Prompts 3.1-3.5: Next.js API routes + integration adapters

**Evening (5 hours):**
- Prompts 4.1-4.5: React components + state management

#### **SUNDAY (10 hours total)**

**Morning (4 hours):**
- Prompts 5.1-5.4: Use case handlers + Paragon setup

**Afternoon (6 hours):**
- Prompts 6.1-6.5: Error handling, documentation, final testing

---

## 📝 KEY COPILOT PROMPTING PRINCIPLES

### **For Each Prompt (Consistent Format)**

```
File: [exact file path]

Responsibility: [What this file does]

Requirements:
1. [Feature/method 1]
2. [Feature/method 2]
... etc

Input/Output Examples:
- Input: [example]
- Output: [example]

Implementation Notes:
- [Note 1]
- [Note 2]

Error Handling:
- [Handle scenario 1]
- [Handle scenario 2]

Use TypeScript strict mode.
Export everything needed for imports.
Include JSDoc for all public methods.
```

### **Example: Tab Service Prompt**

```
File: extension/src/services/TabService.ts

Responsibility: Manage all tab-related operations
- Get open tabs from Chrome
- Categorize tabs via API
- Subscribe to tab changes
- Extract page context

Methods Needed:

1. getOpenTabs(): Promise<BrowserTab[]>
   - Uses chrome.tabs.query({ currentWindow: true })
   - Returns: { id, url, title, faviconUrl, lastAccessed }
   - Error: handle if tabs API unavailable

2. categorizeTabs(tabs: BrowserTab[]): Promise<CategorizedTab[]>
   - Calls POST /api/extension/categorize-tabs
   - Includes: tabs, currentContext
   - Returns: { tabs with categories, groupId, priority }
   - Error: fallback to basic categorization if API fails

3. subscribeToTabChanges(callback): void
   - chrome.tabs.onActivated.addListener()
   - chrome.tabs.onUpdated.addListener()
   - Emit: { action, tab, previousTab }

4. getTabContext(): Promise<PageContext>
   - Get current focused tab
   - Extract page snippet (first 500 chars)
   - Get top 5 related open tabs
   - Return: { currentTab, snippet, relatedTabs }

5. Cache categorization:
   - Store results in IndexedDB with 1-hour TTL
   - Key: tabs.map(t => t.id).join(',')
   - Don't recategorize same tabs within 1 hour

Implementation Notes:
- Handle tab focus changes
- Handle tab closure (remove from memory)
- Handle new tabs (auto-categorize after 2 seconds)
- Log all operations for debugging

TypeScript strict mode.
Export TabService as default class.
```

---

## ✅ SUCCESS CHECKLIST

**By End of Weekend:**

- ✅ Extension loads in Chrome (chrome://extensions)
- ✅ All TypeScript types defined and imported correctly
- ✅ Message router working (can send/receive messages)
- ✅ Tab categorization functional (API called, results shown)
- ✅ Memory service saving highlights
- ✅ At least 3 use cases working (email, meeting, tab org)
- ✅ All React components rendering
- ✅ Dark mode implemented
- ✅ Error handling in place
- ✅ Logging working
- ✅ Git commits after each phase
- ✅ Documentation started
- ✅ No console errors on extension load

**Monday Morning:**

- Deploy Next.js to Vercel
- Update extension API URL
- Invite 10 beta testers
- Collect feedback for Week 2

---

## 🎯 WHAT COPILOT WILL DO

**Copilot generates ~85% of code:**
- All service implementations
- All React components
- All API routes
- All type definitions
- Error handling
- Logging

**You provide:**
- Direction (what to build)
- Integration (wire services together)
- Testing (verify it works)
- Debugging (fix issues)

**Your ratio: 15% coding, 85% reviewing + integrating**

---

## 🚀 READY TO START

**You now have:**
- ✅ Complete feature breakdown (10 use cases)
- ✅ Fresh architecture (no old code)
- ✅ Copilot-ready prompts (just copy-paste)
- ✅ Complete folder structure
- ✅ Type definitions ready
- ✅ 48-hour timeline
- ✅ Git commit strategy
- ✅ Success criteria

**Next step: Start Friday with Prompt 1.1**

---

**Build AUTOME from scratch this weekend. All original code. Zero technical debt. Ship Monday. 🚀**

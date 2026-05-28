# Claude Design Studio

A from-scratch clone of [claude.ai/design](https://claude.ai/design) — an AI-powered UI prototype tool. Describe a UI in plain English, watch Claude stream a self-contained HTML page that renders live in a sandboxed iframe, and refine it conversationally without ever touching code.

Built to match Claude Design's aesthetic 1:1 (warm cream palette, serif headings, Anthropic-style chrome) and reuse the same conceptual model — projects with a single ongoing conversation, file browser, comment/draw annotation modes, present mode — adapted for an AI generator workflow.

![Claude Design Studio](https://img.shields.io/badge/Claude-Design%20Studio-d97757?style=flat-square)
![Tests](https://img.shields.io/badge/tests-179%20passing-success?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## What it does

- **Gallery view** at `/` — Claude Design's "Recent / Your designs / Examples / Design systems" tabs, project cards with live thumbnails, "New prototype" form sidebar (Project name + Wireframe/High-fidelity + Create).
- **Studio view** at `/p/:id` — three columns: project sidebar (conversation history + prompt input) · Design Files tree (PAGES / COMPONENTS / STYLES / SCRIPTS auto-extracted from generated HTML) · live preview iframe with device toggle (mobile / tablet / desktop).
- **Annotation modes** in TopBar:
  - **Comment** — click anywhere on the preview to drop a numbered pin, batch send all pins as a refinement.
  - **Draw** — sketch red strokes on the preview, attach a note, send the bounding boxes as a refinement.
- **Multi-tab** — open several projects simultaneously, `Cmd+W` closes, `Cmd+1..9` switches.
- **Present** — pop the current design open in a new tab as a clean blob URL.
- **Share** — copies the current HTML to clipboard; **Export** menu does Copy HTML / Download `.html` / Copy as React component.

## Backends (configurable in `/settings`)

| Backend | When to use | API key needed |
|---|---|---|
| **Claude Agent SDK** (default) | You have Claude Code installed and a Max plan. The SDK piggybacks on the local CLI auth — no keys, no quota, just works. | No |
| **Custom API** | OpenAI-compatible or Anthropic `/v1/messages` endpoint. Sends a system prompt + your turns; uses Anthropic **prompt caching** for ~90% cost reduction on multi-turn refinements. | Yes (BYO) |
| **Local LLM** | Ollama, LM Studio, vLLM, anything that speaks `/v1/chat/completions`. | Optional |

All state lives in `localStorage` — no server-side database, no telemetry. API keys never appear in server logs and never reach the browser when using the proxied custom backend.

## Prompt strategy (informed by v0 / Lovable / Anthropic best practices)

- **Structured system prompt**: persona + strict output contract (markdown rationale → ` ```html ` fence), design constraints (3–5 colour palette, mobile-first, semantic HTML, ARIA, real placeholder copy), explicit **refinement rules** ("always return the full updated HTML, never a diff").
- **Current-state injection**: every turn the canonical preview HTML is wrapped into the last user message in markdown fences, so the model never loses its anchor even if the conversation context expires.
- **Sliding-window history**: keep the first user turn (the project brief) + the last 8 turns; drop everything in between. Cost and latency stay bounded for long sessions.
- **Anthropic prompt caching** (custom-api adapter): system prompt + last turn marked `cache_control: ephemeral`. Reduces cost up to 90% and latency up to 85% according to Anthropic.
- **Project context threading**: project title + free-form notes are woven into the system prompt every turn for coherence.

## Refresh resilience

- **Draft persistence** — what you type in the prompt input is saved to `localStorage` per-project, debounced at 250 ms. Survives reloads and project switches.
- **Interrupted-generation detection** — if you reload while Claude is still streaming, the next load shows a coral "Generation was interrupted · Resume" chip in the sidebar. One click re-sends the last user prompt with the current HTML attached.
- **`beforeunload` guard** — accidental `Cmd+R` during a stream pops the browser's native confirmation.

## Quickstart

```bash
npm install          # install dependencies
npm run dev          # Vite dev server + /api middleware at http://localhost:5173
npm test -- --run    # unit tests (Vitest + jsdom)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run check        # typecheck + lint + tests in one shot
npm run build        # tsc -b && vite build, output to dist/
npm start            # serve dist/ behind an Express server (production-style)
```

Open <http://localhost:5173>, fill out the New prototype form on the left, click Create, then describe what you want in the sidebar prompt input.

## Architecture at a glance

```
src/
  routes/
    GalleryPage.tsx        # / — project cards + create form
    StudioPage.tsx         # /p/:id — files + preview + prompt
    SettingsPage.tsx       # /settings — backend picker
  components/
    layout/                # TopBar, TabBar, Sidebar, DarkModeToggle
    gallery/               # ProjectCard, CreateProjectForm
    files/                 # FilesPanel (auto-extracts pages/components/styles/scripts)
    preview/               # PreviewPane + CommentOverlay + DrawOverlay + DeviceToggle
    prompt/                # PromptInput
    sidebar/               # ConversationView (chronological turns, scroll-to-bottom)
    ui/                    # Icon, Markdown, Button, Field, Toast
  store/
    designStore.ts         # sessions, turns, openTabIds, comments, drawings (zustand + localStorage)
    settingsStore.ts       # theme + backend choice
    interactionStore.ts    # comment/draw mode, active file selection
  hooks/
    useStreamingGenerate   # SSE pipeline → store
    usePromptDraft         # per-project draft persistence
    useAnnotationSubmit    # send comments/drawings as refinements
  lib/
    parseHtmlFiles         # one HTML doc → virtual file tree
    extractHtml            # tolerant code-fence stripper for streaming
    stripCodeFences        # used by ConversationView to render only prose
server/
  routes/
    generate.ts            # POST /api/generate → SSE pipeline
    testBackend.ts         # POST /api/test-backend
    status.ts              # GET /api/status (SDK + CLI probe)
  adapters/
    claudeAgentSdk.ts      # uses @anthropic-ai/claude-agent-sdk query() — piggybacks on local Claude Code auth
    customApi.ts           # OpenAI-compatible or Anthropic Messages, with prompt caching
    localLlm.ts            # Ollama / LM Studio / vLLM
  lib/
    systemPrompt.ts        # buildSystemPrompt({ projectTitle, projectNotes })
    prepareMessages.ts     # sliding window + current-HTML injection
```

## Performance

After `npm run build`, run the bundle-size guard to verify the gzipped budget (≤ 350 KB):

```bash
node scripts/check-bundle-size.mjs
```

The script exits non-zero if entry/UI chunks exceed the threshold.

## Status

- 🟢 179 / 179 unit tests passing (Vitest + jsdom)
- 🟢 `tsc --noEmit` clean
- 🟢 Smoke-tested in Chrome against the Claude Agent SDK backend (your local Claude Max plan)

## License

MIT.

## Credits

This is an independent clone built for learning + portfolio purposes. **Claude** and **Claude Design** are trademarks of Anthropic; this project is not affiliated with Anthropic. System-prompt patterns inspired by leaked prompts of [v0](https://v0.dev) and [Lovable](https://lovable.dev) collected in [x1xhlol/system-prompts-and-models-of-ai-tools](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools).

# NoteSnap Build Plan

## Overview

Greenfield Next.js web app for AI-powered sermon note-taking. Mobile-first, uses Tiptap editor, Gemini 2.5 Flash for OCR/translation, bundled local Terjemahan Baru Bible dataset, Prisma + SQLite, and Tailwind CSS.

---

## Tech Stack (Confirmed)

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Editor | Tiptap v2 |
| Styling | Tailwind CSS v3 |
| ORM | Prisma |
| DB (dev) | SQLite |
| DB (prod) | PostgreSQL (provider swap only) |
| AI | Google Gemini 2.5 Flash API |
| Bible data | Bundled local JSON (Terjemahan Baru) |
| Camera | HTML5 `<video>` + `<canvas>` |
| Stability detection | Canvas pixel diff |

---

## Project Structure

```
notesnap/
├── app/
│   ├── layout.tsx               # Root layout, mobile viewport meta, PWA meta
│   ├── page.tsx                 # Note list / home screen
│   ├── notes/
│   │   └── [id]/
│   │       └── page.tsx         # Note editor view
│   └── api/
│       ├── notes/
│       │   ├── route.ts         # GET all, POST create
│       │   └── [id]/
│       │       └── route.ts     # GET one, PATCH update, DELETE
│       ├── ocr/
│       │   └── route.ts         # POST: base64 image → Gemini → Markdown
│       └── bible/
│           └── route.ts         # GET: ?book=Yohanes&chapter=3&verse=16
├── components/
│   ├── editor/
│   │   ├── NoteEditor.tsx       # Tiptap instance, slash commands, verse inject
│   │   ├── BibleVerseExtension.ts   # Custom Tiptap node → styled blockquote
│   │   └── SlashCommandExtension.ts # /ayat command handler
│   ├── camera/
│   │   ├── CameraView.tsx       # <video> + <canvas> overlay, capture button
│   │   ├── useFrameSampler.ts   # Hook: pixel diff stability + capture logic
│   │   └── CameraControls.tsx   # Translate toggle + stability indicator
│   ├── notes/
│   │   ├── NoteList.tsx         # Home screen note cards
│   │   └── NoteCard.tsx         # Individual note preview card
│   └── ui/
│       ├── ToggleSwitch.tsx     # Reusable toggle (translate mode)
│       └── LoadingSpinner.tsx
├── lib/
│   ├── gemini.ts                # Gemini API client + prompt builders
│   ├── bible.ts                 # Local JSON lookup + book name normalization
│   └── prisma.ts                # Prisma client singleton
├── data/
│   └── tb.json                  # Bundled Terjemahan Baru Bible (full dataset)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── manifest.json            # PWA manifest
└── ...config files
```

---

## Data Models (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  notes     Note[]
}

model Note {
  id        String   @id @default(cuid())
  title     String   @default("Untitled Note")
  content   String   @default("")   // Tiptap JSON stringified
  userId    String?                 // nullable — Phase 1 single-user, no auth
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Phase 1: `userId` is nullable — no auth, single local user.
Phase 2 (production): enforce FK to `User` after adding auth.

---

## Implementation Phases

### Phase 0 — Project Bootstrap

1. `npx create-next-app@latest notesnap` — TypeScript, Tailwind, App Router, no `src/` dir
2. Install dependencies:
   - `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder`
   - `@google/generative-ai`
   - `prisma @prisma/client`
3. `npx prisma init --datasource-provider sqlite`
4. Define schema, run `npx prisma migrate dev --name init`
5. Set up `lib/prisma.ts` singleton (global instance pattern to avoid hot-reload leaks in dev)
6. Add `GEMINI_API_KEY` to `.env.local`

---

### Phase 1 — Note CRUD

**API routes:**
- `GET /api/notes` — list all notes (id, title, updatedAt), ordered by updatedAt desc
- `POST /api/notes` — create note with default title, return `{ id }`
- `GET /api/notes/[id]` — fetch full note
- `PATCH /api/notes/[id]` — update title and/or content
- `DELETE /api/notes/[id]` — delete note

**UI:**
- Home (`/`): scrollable list of `NoteCard` components, FAB to create and navigate to new note
- Editor (`/notes/[id]`): full-screen Tiptap editor, auto-save on `onUpdate` with 1-second debounce, back chevron to home
- Editable `<h1>` above editor for the note title (separate from Tiptap content)
- "Saving..." / "Saved ✓" subtle indicator in header

---

### Phase 2 — Tiptap Editor + Bible Verse Command

**Editor setup:**
- Extensions: `StarterKit`, `Placeholder`, custom `BibleVerseExtension`, custom `SlashCommandExtension`
- Content persisted as stringified Tiptap JSON in `Note.content`

**`/ayat` slash command flow:**
1. User types `/ayat` in editor → inline command input appears
2. User types reference e.g. `Yohanes 3:16` and presses Enter
3. Frontend calls `GET /api/bible?book=Yohanes&chapter=3&verse=16`
4. API route calls `lib/bible.ts` — in-memory lookup on `data/tb.json` (server-side import only)
5. Returns `{ reference: "Yohanes 3:16", text: "Karena begitu besar..." }`
6. Editor inserts a `BibleVerseExtension` node at cursor position

**`BibleVerseExtension` node:**
- Custom Tiptap `Node` extension
- Renders as `<blockquote>` with reference in a `<cite>` tag
- Tailwind styling: left border accent, italic body, muted background

**`data/tb.json` structure:**
```json
{
  "Yohanes": {
    "3": {
      "16": "Karena begitu besar kasih Allah akan dunia ini..."
    }
  }
}
```

**`lib/bible.ts`** handles:
- Book name normalization (abbreviations → full name, e.g. "Yoh" → "Yohanes", "Kej" → "Kejadian")
- Returns `null` for not-found references (editor shows inline error message)

**Bible data sourcing:**
TB dataset (~3–5 MB) sourced from open-source Indonesian Bible JSON repositories. Downloaded once during setup and placed in `data/tb.json`. Server-side import only — never bundled to the client.

---

### Phase 3 — Camera + OCR

**`CameraView.tsx`:**
- `<video autoPlay playsInline>` (full-width, mobile aspect ratio)
- Hidden `<canvas>` for frame capture only
- Semi-transparent viewfinder overlay with corner markers
- Camera on/off toggle; `getUserMedia` requested only when panel opens
- If permission denied, shows inline error with browser settings instructions
- Integrates `useFrameSampler` hook and `CameraControls`

**`useFrameSampler.ts` hook:**
- `setInterval` every 500ms while camera is active
- Draws video frame to hidden canvas, reads pixel data
- Pixel diff: sample a uniform grid (~100 points) — not every pixel, for performance
- If diff below threshold for 3 consecutive samples (~1.5 s stability) → auto-capture
- On capture: `canvas.toDataURL('image/jpeg', 0.8)` → strip data URI prefix → POST to `/api/ocr`
- Resets stability counter after each capture
- Exposes: `{ isStable, isCapturing, triggerManualCapture }`

**`CameraControls.tsx`:**
- Toggle: "Terjemahkan ke Indonesia" (passes `translate` flag to OCR request)
- Stability dot: gray (moving) → yellow (steadying) → green (stable/capturing)
- "Ambil Sekarang" manual capture button as fallback

**`/api/ocr` route:**
- `POST` accepts `{ image: string (base64 JPEG), translate: boolean }`
- Server-side only — `GEMINI_API_KEY` never exposed to browser
- Returns `{ markdown: string }`

**`lib/gemini.ts` prompts:**

Extract only (`translate: false`):
```
You are an OCR assistant. Extract only the sermon text or bullet points visible in this image.
Ignore backgrounds, decorations, speaker names, and church logos.
Fix any typos or distortions caused by projector glare or camera angle.
Return clean, formatted Markdown. Return only the Markdown — no explanation, no preamble.
```

Extract + translate (`translate: true`):
```
You are an OCR and translation assistant. Extract the sermon text or bullet points from this image,
then translate them accurately into Indonesian (Bahasa Indonesia).
Ignore backgrounds, decorations, and logos. Fix glare-related distortions.
Return clean, formatted Markdown in Indonesian. Return only the Markdown — no explanation, no preamble.
```

**Editor integration:**
- Camera panel is a slide-up sheet toggled by a camera icon in the editor toolbar
- OCR result appended to Tiptap doc:
  `editor.commands.insertContentAt(editor.state.doc.content.size, parsedMarkdown)`

---

### Phase 4 — Mobile Polish & PWA

- Viewport meta: `width=device-width, initial-scale=1, maximum-scale=1`
- Safe area insets: `env(safe-area-inset-bottom)` for camera panel and FAB
- PWA: `public/manifest.json` with `display: standalone`, theme color, icons
- Dark mode: Tailwind `dark:` classes following `prefers-color-scheme`
- Toast notifications for OCR errors and network failures
- Skeleton loaders on note list initial load
- Offline notice banner when AI API is unreachable

---

## SQLite → PostgreSQL Migration Path

Only two changes needed for production:

1. `schema.prisma`: `provider = "sqlite"` → `provider = "postgresql"`, update `DATABASE_URL`
2. Run `prisma migrate deploy` against the production DB

No application code changes required — Prisma client API is identical across providers.

---

## Build Order (Recommended Execution Sequence)

1. Bootstrap project + Prisma setup + `.env.local`
2. Note CRUD API routes
3. Home page — note list UI
4. Editor page — Tiptap + auto-save
5. Bible verse slash command + `lib/bible.ts` + local JSON
6. Gemini OCR API route + `lib/gemini.ts`
7. Camera component + `useFrameSampler` hook
8. Camera panel integration in editor
9. PWA manifest + mobile polish + dark mode
10. End-to-end smoke test: note creation, verse insert, camera OCR

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**React Component Generator** is an AI-powered UI workbench that generates React components from natural language prompts. Users input a description, and the system generates working React code that's immediately previewed and displayed.

Key features:
- **Multi-provider support**: Anthropic Claude or Google Gemini
- **Live preview**: Generated components render in real-time using react-live
- **Code inspection**: View and copy generated component source
- **Component management**: Create, delete, and regenerate components

## Technology Stack

**Frontend**
- React 19 with TypeScript
- Vite (build tool)
- react-live (runtime component evaluation)
- ESLint with React/React Hooks plugins

**Backend**
- Bun (runtime + HTTP server)
- Integrates with Anthropic Claude API and Google Gemini API

**Package Manager**: Bun

## Available Commands

```bash
# Install dependencies
bun install

# Development (runs API server + Vite dev server concurrently)
bun run dev
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3002

# Run only API server (watches for changes)
bun run server

# Production build (TypeScript + Vite)
bun run build

# Lint code
bun run lint

# Preview production build
bun run preview
```

## Project Architecture

### Directory Structure

```
src/
├── App.tsx              # Main application component (layout, state management)
├── main.tsx             # React entry point
├── App.css              # Global styles
├── index.css            # Base styles
├── components/
│   ├── PromptInput.tsx      # Input form for component descriptions
│   ├── ComponentCard.tsx     # Display card for each generated component
│   ├── LivePreview.tsx       # Runtime preview using react-live
│   └── CodeView.tsx          # Code display and copy functionality
├── hooks/
│   └── useComponentGenerator.ts  # State management for component generation
├── types/
│   └── index.ts         # TypeScript type definitions
└── assets/              # Static images and SVGs

server/
└── index.ts             # Bun HTTP server with API endpoints
```

### Core Components

**App.tsx** - Main application
- Manages API key and provider selection (Anthropic/Google)
- Handles API key input via UI or .env file
- Displays component list and generation UI
- Routes requests through `useComponentGenerator` hook

**useComponentGenerator.ts** - State and generation logic
- Manages list of generated components
- Handles fetch requests to `/api/generate` endpoint
- Manages loading and error states
- Provides add/remove/clear operations

**PromptInput.tsx** - Component generation form
- Text input for natural language descriptions
- Submit button with loading state
- Example prompts for inspiration

**ComponentCard.tsx** - Generated component display
- Shows prompt that generated the component
- Renders LivePreview and CodeView
- Actions: regenerate, copy code, delete
- Displays component ID and creation date

**LivePreview.tsx** - Runtime component renderer
- Uses react-live to evaluate component code
- Provides refresh button to remount component
- Catches and displays rendering errors

**CodeView.tsx** - Source code display
- Syntax-highlighted code display
- Copy-to-clipboard functionality

### Server (server/index.ts)

**HTTP Endpoints:**
- `GET /api/config` - Returns which API keys are configured in .env
- `POST /api/generate` - Generates component code
  - Request body: `{ prompt: string, apiKey?: string, provider: 'anthropic' | 'google' }`
  - Returns: `{ code: string }` or `{ error: string }`

**Key Functions:**
- `callAnthropic()` - Calls Claude API via Anthropic
- `callGoogle()` - Calls Gemini API via Google
- `stripCodeFences()` - Removes markdown code fences from API responses
- `ensureRenderCall()` - Ensures generated code has `render()` call at end

**System Prompt** - Embedded SYSTEM_PROMPT controls component generation:
- Components must use inline styles only (no imports)
- Plain JavaScript only (no TypeScript syntax)
- Must define a component and call `render(<Component />)`
- React is available as global (no import needed)

## Critical Design Constraints

### Generated Component Requirements

1. **Runtime Evaluation**: Components are evaluated at runtime by react-live, not compiled
2. **No TypeScript**: Generated code must be plain JavaScript (no type annotations, interfaces, generics)
3. **Global React**: React is injected into scope; components must NOT import React
4. **Inline Styles Only**: Components use style objects, no external CSS imports
5. **Self-Contained**: Components must have `render()` call at the end

### Environment Configuration

Two ways to provide API keys:

1. **Environment Variables (.env)**
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AIza...
   ```
   - Server reads these at startup
   - Frontend checks availability via `/api/config`

2. **Runtime Input (UI)**
   - Users can input API keys in the settings panel
   - Frontend passes keys directly to `/api/generate` endpoint

## Development Workflow

### Adding a New Feature

1. Frontend changes: Edit components in `src/components/` or hooks in `src/hooks/`
2. Backend changes: Edit `server/index.ts` (restart with `bun run server`)
3. Type changes: Update `src/types/index.ts` if needed
4. Test locally: `bun run dev` (both frontend and API server)

### Debugging Component Generation Issues

If generated components fail to render:

1. Check server logs for API errors (rate limits, bad keys, API changes)
2. Verify the system prompt constraints in `server/index.ts` are being followed
3. Use browser DevTools console to see react-live errors
4. Test with simpler prompts first

### Code Quality

- ESLint enforces React best practices and hooks rules
- Run `bun run lint` to check for issues
- TypeScript compilation: `bun run build` includes type checking via `tsc -b`

## Key Implementation Details

### Component ID Generation
```javascript
id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
```
Combination of timestamp and random string ensures uniqueness.

### API Error Handling
- 503 (Service Unavailable): User-friendly message about API overload
- 429 (Rate Limited): User-friendly message about rate limiting
- Other errors: Passes error message from API response to user

### Max Token Limits
- Anthropic: 4096 tokens
- Google: 8192 tokens
- MAX_TOKENS finish reason from Google triggers specific error message

### CORS Configuration
Server includes standard CORS headers for all responses:
```javascript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type'
```

## Testing Generated Components

1. Simple test: "a button component"
2. Stateful test: "counter component" (uses React.useState)
3. Styled test: "gradient button with hover effect"
4. Complex test: "animated loading spinner"

Use these to verify the system is working and catch regressions.

## Common Tasks

### Add a new AI provider
1. Add provider name to `Provider` type in `server/index.ts`
2. Create `call[ProviderName]()` async function in server
3. Add provider to provider routing logic
4. Add provider config in `App.tsx` PROVIDER_CONFIG
5. Update type definitions if needed

### Modify system prompt behavior
Edit the `SYSTEM_PROMPT` constant in `server/index.ts`. Remember:
- Components use only inline styles
- No TypeScript syntax
- Must include render() call
- React is globally available

### Add component filtering/search
- Extend `GeneratedComponent` type if needed
- Add filter state to `useComponentGenerator`
- Add UI controls in App.tsx or new component

### Change API model
Update the `model` field in `callAnthropic()` or `callGoogle()` functions in `server/index.ts`.

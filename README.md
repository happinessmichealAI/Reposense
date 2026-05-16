# RepoSense — AI Repository Intelligence

**IBM Bob Hackathon 2026**  
Innovative Engineers Team

---

## 🎯 Overview

RepoSense is an AI-powered repository intelligence tool that analyzes JavaScript and TypeScript codebases to visualize dependencies, calculate blast radius, and provide AI-driven insights for safer code changes.

### Key Features

- **Interactive Dependency Graph** — D3 force-directed visualization with BFS wave propagation
- **Blast Radius Analysis** — See exactly what breaks when you change a file
- **IBM Bob Intelligence** — AI-powered dependency risk assessment
- **Groq Fallback** — Smart fallback using llama3-70b-8192
- **Ask the Repo** — Chat with your codebase using AI
- **4-Level Fallback Pipeline** — Demo never dies (Bob → Groq → Parser → Demo)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Supabase account (free at [supabase.com](https://supabase.com))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd reposense

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### Environment Setup

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Go to SQL Editor and run this SQL:

```sql
create table bob_sessions (
  id uuid default gen_random_uuid() primary key,
  repo_name text not null,
  timestamp timestamptz default now(),
  bob_output jsonb,
  fallback_used boolean default false
);
```

2. **Get API Keys:**
   - Groq: [console.groq.com](https://console.groq.com) → Create API key
   - Supabase: Project Settings → API → Copy URL and anon key

3. **Configure Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env and add your keys:
# GROQ_API_KEY=your_groq_api_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

**Terminal 1 — Frontend:**
```bash
npm run dev
# Opens at http://localhost:5173
```

**Terminal 2 — Backend:**
```bash
cd backend
npm start
# Runs at http://localhost:3001
```

---

## 📊 Architecture

### Frontend Stack
- **React 18** — UI framework
- **Vite** — Build tool and dev server
- **React Router** — Client-side routing
- **D3.js** — Force-directed graph visualization

### Backend Stack
- **Node.js + Express** — API server
- **simple-git** — Repository cloning
- **Groq SDK** — AI intelligence (llama3-70b-8192)
- **Supabase** — Session logging and evidence storage

### Data Flow

```
User selects repo
    ↓
POST /api/analyze
    ↓
Clone repo (shallow)
    ↓
Parse dependencies (JS/TS only)
    ↓
Calculate import counts & risk
    ↓
Try IBM Bob Shell
    ├─ Success → Merge with parser data → Save to Supabase
    └─ Fail → Try Groq API
        ├─ Success → Merge with parser data → Save to Supabase
        └─ Fail → Return parser data only
            └─ Fail → Return demo data (demo never dies)
    ↓
Render interactive graph
    ↓
User clicks node → BFS wave propagation
    ↓
Impact panel shows blast radius
    ↓
User asks question → Groq chat response
```

---

## 🎨 Key Components

### Frontend

**`src/pages/Landing.jsx`**
- Premium dark landing page
- Sidebar with recent repos
- Search input and risk filter

**`src/pages/Loading.jsx`**
- API-driven progress bar
- Cycling status messages
- Error handling with retry

**`src/pages/GraphPage.jsx`**
- Graph wrapper with state management
- Top action bar
- Demo mode and sampled banners

**`src/components/Graph.jsx`**
- D3 force-directed graph
- BFS wave system (3 depth levels)
- Focus mode with dimming
- Node click interactions

**`src/components/ImpactPanel.jsx`**
- Bottom slide-up panel
- Blast radius display
- IBM Bob reason field
- Ask the Repo chat UI

**`src/components/Sidebar.jsx`**
- Fixed left sidebar
- Recent repository sessions
- "Powered by IBM Bob" footer

### Backend

**`backend/server.js`**
- Express app with CORS
- 4-level fallback pipeline
- Health check endpoint
- Session export endpoint

**`backend/parser.js`**
- Repository cloning (shallow)
- JS/TS file scanning
- Import/require parsing
- Import count calculation
- 250-file sampling algorithm

**`backend/bobIntegration.js`**
- IBM Bob Shell integration
- Merge function (preserves importCount)
- Supabase logging

**`backend/groqFallback.js`**
- Groq API integration (llama3-70b-8192)
- Merge function (preserves importCount)
- JSON extraction from markdown

**`backend/askRepo.js`**
- Groq-powered chat
- Context building from graph data
- Suggested questions

**`backend/supabase.js`**
- Supabase client initialization
- Session save function
- Export function for judge evidence

---

## 🧪 Testing

### Test the Demo Graph

1. Open http://localhost:5173
2. Click "Try Demo Repository"
3. Watch loading screen
4. Click `paymentProcessor.ts` node
5. Watch cinematic wave animation
6. See impact panel slide up
7. Ask a question in the chat

### Test with Real Repos

Enter these in the search bar:
- `facebook/react`
- `vercel/next.js`
- `microsoft/vscode`

**Note:** Large repos may take 20-30 seconds to analyze.

### Test Fallback Pipeline

1. **Without API keys:** Returns parser data only
2. **With Groq key:** Uses Groq intelligence
3. **With IBM Bob:** Uses Bob intelligence (when available)
4. **All fail:** Returns demo data (demo never dies)

---

## 🏆 IBM Bob Integration

### How IBM Bob is Used

1. **Primary Intelligence Layer:** Bob analyzes dependency relationships and provides blast radius estimates with reasoning
2. **Prompt Engineering:** Carefully crafted prompt focuses Bob on dependency impact and operational risk
3. **Data Preservation:** Merge function preserves critical `importCount` field from parser
4. **Session Logging:** All Bob analyses saved to Supabase for judge evidence
5. **Graceful Fallback:** If Bob fails, Groq provides smart fallback intelligence

### Proof of IBM Bob Usage

Export all Bob sessions for judges:
```bash
curl http://localhost:3001/api/export-sessions > submission/bob-evidence/bob-sessions.json
```

This file contains:
- Repository names analyzed
- Timestamps
- Bob's complete output
- Fallback status (true/false)

---

## 🎯 Demo Script (2 minutes)

1. **Opening (10s):** "RepoSense — AI repository intelligence for enterprise teams"
2. **Landing (15s):** Show premium design, recent repos, IBM Bob branding
3. **Select Repo (5s):** Click "novuhq/novu"
4. **Loading (10s):** Watch progress bar and status messages
5. **Graph Render (10s):** Dramatic reveal of dependency graph
6. **THE MONEY SHOT (30s):** Click paymentProcessor.ts
   - Wave 0 lights up (red)
   - Wave 1 cascades (orange)
   - Wave 2 propagates (yellow)
   - Panel slides up
   - Blast radius counts up: 0 → 14
   - IBM Bob reason displays
7. **Ask the Repo (20s):** "What would break if I deleted auth.ts?"
8. **Risk Filter (10s):** Filter to "High Risk Only"
9. **Closing (10s):** "Built with IBM Bob Shell, Groq API, and D3.js"

---

## 📦 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables:
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy!

### Environment Variables

```env
# Required
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
PORT=3001
NODE_ENV=production
```

---

## 🐛 Troubleshooting

### Frontend won't connect to backend
- Check CORS is enabled in server.js
- Verify backend is running on port 3001
- Check browser console for errors

### Parser fails on large repos
- Repos >250 files are automatically sampled
- 30-second timeout protection
- Check git is installed and accessible

### Groq API errors
- Verify API key is correct
- Check rate limits (free tier)
- Ensure internet connection

### Supabase errors
- Verify table `bob_sessions` exists
- Check URL and anon key are correct
- Ensure project is not paused

---

## 📄 License

MIT License — Built for IBM Bob Hackathon 2026

---

## 👥 Team

**Innovative Engineers**  
Building the future of repository intelligence

---

**RepoSense** — Understand your repository's dependency intelligence

# ♔ Chess Arena

> **Championship Real-Time Multiplayer Chess Application**  
> Built completely from scratch with React, TypeScript, Vite, Tailwind CSS, Socket.IO, and Node.js.

---

## 🌟 Executive Summary

**Chess Arena** is a standalone, luxury tournament chess application designed for competitive multiplayer play. Inspired by high-end wooden tournament boards, it features a warm ivory and dark walnut visual theme, 3D specular SVG Staunton pieces, server-authoritative move validation, synchronized clocks, an authoritative 60-second opponent countdown with automatic walkover rulings, and an independent persistence engine.

Chess Arena is completely isolated from existing tournament management databases:
- Opens directly on the **Match Entry Screen** (No landing page, no public matchmaking lobby).
- Supports external tournament website handoffs via secure URL invitations (`?roomId=...&player=...`).
- Persists match results, moves, and PGN records independently in PostgreSQL / Supabase or ACID-compliant local storage.
- Operates multiple simultaneous tournament boards concurrently with zero cross-talk.

---

## 🎨 Luxury Visual Identity & Architecture

- **Main Background**: `#0B0B0D`
- **Secondary Background**: `#151311`
- **Cards & Panels**: `#1D1915` with subtle gold borders (`#D9A441`)
- **Board Styling**:
  - Dark walnut wooden bevel with metallic corner joints
  - Light squares: Warm Ivory (`#DFC8A5`)
  - Dark squares: Dark Walnut (`#784523`)
  - Inside coordinates: Gold typography (`#D9A441`)
  - Highlights: Warm amber last-move glows and gold-selected rings
- **3D Staunton Pieces**: Custom SVG vector components with layered specular gradients, depth shadows, and realistic curvature.
- **Audio Effects**: Zero-dependency Web Audio API synthesizer for instant wooden move thuds, captures, castling, check chimes, and victory fanfares.

---

## ♟ Core Tournament Systems

### 1. Match Entry & URL Integration
The application displays the **Match Entry** screen immediately upon opening:
- Inputs: **Room ID**, **Room Password**, **Player Name**, **Rating**, and **Time Control**.
- **URL Parameter Support**: External tournament analytics websites can redirect players directly using `?roomId=ROOM101&player=Aarav`. Credentials are securely validated server-side without exposing passwords in query strings.

### 2. Authoritative 60-Second Waiting & Walkover System
- When the first player joins, the server generates an authoritative deadline (`Date.now() + 60_000`) and starts an active timeout.
- A synchronized countdown circle displays remaining time (`01:00`, `00:59`, ...).
- **Walkover Victory**: If an opponent fails to join within 60 seconds, the backend atomically halts new joins, declares the first player the winner by **WALKOVER**, stores the official tournament ruling in the database, and awards victory. Late-joining opponents are strictly rejected.

### 3. Opponent Connection & Ready Confirmation
- When the second player arrives before 60 seconds expire, the waiting timer is immediately cancelled.
- Both players enter the **READY Confirmation** screen.
- Each player must independently click **CONFIRM READY**.
- The game clock begins only once both players are connected and confirm readiness.
- Disconnections prior to match start automatically reset readiness and notify the opponent.

### 4. Authoritative Chess Engine & Multiplayer Gameplay
- Validates all moves server-side via `chess.js` (Pawns, Knights, Bishops, Rooks, Queens, Kings, Castling, En Passant, Pawn Promotion, Check, Checkmate, Stalemate, 50-Move Rule, Threefold Repetition, Insufficient Material).
- Client-side optimistic rendering with legal move highlights.
- Prevents turn violations, unauthorized socket injections, and illegal square moves.

### 5. Server-Authoritative Clocks
- Time controls: **10+5 Blitz**, **5+0 Blitz**, **3+0 Blitz**, **15+10 Rapid**, and custom setups.
- Real-time elapsed time deduction on each move + increment addition.
- Flag detection triggers automatic timeout loss.

### 6. Multiple Independent Rooms Concurrently
- Unlimited concurrent tournament matches running in isolation (`ROOM 1001`, `ROOM 1002`, `ROOM 1003`).
- Independent timers, board states, players, move histories, and passwords.

### 7. Match History & Persistence
- Stores match metadata, player identities, ratings, winner, win reason, moves array, and full PGN notation.
- Database:
  - **Local Development**: ACID-compliant JSON store (`server/data/chess_arena_db.json`) ensuring completed games survive server restarts.
  - **Production (Render/Supabase)**: Connects to PostgreSQL via `DATABASE_URL`.

---

## 📁 Project Structure

```
d:\dbms-chesspage\
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── chess/              # 3D Staunton SVG piece components
│   │   ├── components/         # MatchEntry, WaitingScreen, ReadyConfirmation,
│   │   │                       # Chessboard, GameScreen, GameOverModal, PromotionModal
│   │   ├── services/           # Socket.IO client service
│   │   ├── utils/              # Web Audio sound synthesizer
│   │   ├── types/              # Frontend types
│   │   ├── App.tsx             # State coordinator & screen router
│   │   └── main.tsx            # React root mount
│   ├── vite.config.ts
│   └── package.json
│
├── server/                     # Backend Application
│   ├── src/
│   │   ├── database/           # Database adapter (PostgreSQL / Local ACID storage)
│   │   ├── rooms/              # ChessRoom, RoomManager (Walkover & Clock engines)
│   │   ├── routes/             # REST API routes (/api/rooms, /api/history)
│   │   ├── sockets/            # Socket.IO event handlers
│   │   └── index.ts            # Express + Socket.IO server entry
│   ├── test/                   # Comprehensive Vitest tournament test suite
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                     # Shared Types and Event Constants
│   ├── types.ts
│   └── events.ts
│
├── render.yaml                 # Render backend deployment manifest
├── vercel.json                 # Vercel frontend deployment manifest
├── .env.example                # Environment variable documentation
└── package.json                # Root monorepo orchestration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+

### Installation
Clone the repository and install all dependencies:
```bash
# Install root and workspace dependencies
npm install
npm run build
```

### Running Locally

1. **Start the Backend Server** (Port `4000`):
   ```bash
   npm run dev:server
   ```

2. **Start the Frontend Client** (Port `5173`):
   ```bash
   npm run dev:client
   ```

3. Open two browser tabs or private windows at:
   ```
   http://localhost:5173
   ```
   - Enter `ROOM-101`, password `password123`, and your player name in both tabs.
   - Observe Tab 1 entering the 60s waiting countdown.
   - Observe Tab 2 joining, cancelling the countdown, and displaying the Ready screen.
   - Click Ready on both tabs to initiate the tournament chess match!

---

## 🧪 Automated Testing

Chess Arena includes a comprehensive integration test suite covering all 12 critical tournament scenarios:

```bash
npm run test
```

### Verified Test Cases:
- [x] **TEST 1**: First player enters and 60-second countdown starts.
- [x] **TEST 2**: Second player enters before 60s; countdown is stopped immediately.
- [x] **TEST 3**: Both players confirm READY; clock and match start automatically.
- [x] **TEST 4**: Legal moves are broadcasted to opponent in real time.
- [x] **TEST 5**: Illegal moves are strictly rejected by the server engine.
- [x] **TEST 6**: First player waits 60s without an opponent; WALKOVER victory is declared.
- [x] **TEST 7**: Second player attempting to join after walkover timeout is rejected.
- [x] **TEST 8**: Third player attempting to join full room is rejected.
- [x] **TEST 9**: Player disconnects and reconnects with session token.
- [x] **TEST 10**: Checkmate, draw offers, mutual agreements, and resignations.
- [x] **TEST 11**: Multiple independent rooms run concurrently with zero cross-talk.
- [x] **TEST 12**: Match history persists across server restarts.

---

## 🌐 Production Deployment

### Backend Deployment (Render)
1. Push the repository to GitHub.
2. In Render, select **New > Blueprint** and choose this repository. It will automatically detect `render.yaml`.
3. (Optional) Provide a PostgreSQL `DATABASE_URL` from Supabase or Render Postgres for cloud database persistence.

### Frontend Deployment (Vercel)
1. Import the repository in Vercel.
2. Set Root Directory to `client` (or leave at root with `vercel.json` configured).
3. Set Environment Variable:
   - `VITE_BACKEND_URL`: `https://your-chess-arena-server.onrender.com`
4. Deploy!

---

## 📄 License
ISC © Chess Arena Team


---
name: raven-07-shadow-strike-build
description: Complete 2D run-and-gun game built with TypeScript, Vite, and Phaser 3
metadata:
  type: project
---

A complete, playable 2D side-scrolling run-and-gun game (RAVEN-07: SHADOW STRIKE) built and verified. All assets are procedurally generated — no external art/music files required.

**Why:** Successfully executed `/personal-development /development-director` to build a full game autonomously from the master prompt.

**How to apply:** Run `npm run dev` from `raven-07/` directory. Use `! npx playwright test` for browser test verification before any major changes.

## Status
- **44 TypeScript source files** across all architecturally-specified directories
- **TypeScript compiles with zero errors** (tsc --noEmit)
- **Production build succeeds** (`npm run build`)
- **4/4 Playwright browser tests pass** (loading, menu start, movement, pause)
- **Game is playable** in browser via dev server

## Key Technical Details
- Phaser 3.90.0 (not v4 — v4 API differs significantly)
- tsconfig relaxed from defaults (strict:false) for rapid development
- Graphics API: use `fillEllipse`/`strokeEllipse` not `ellipse`; `lineStyle` not `setLineWidth`/`setStrokeStyle`
- Rectangle: `setFillStyle`/`strokeColor` not `fillStyle`/`setStrokeColor`
- Arcade.Body uses `collisionMask` property, not `setCollisionGroup`
- All enum imports must be regular `import` (not `import type`) when used as values

## Verification Commands
```bash
cd raven-07
npx tsc --noEmit       # Type check
npm run build          # Production build
npm run dev            # Dev server (port 5173/5174)
npx playwright test    # Browser tests
```

[[raven-07-game-architecture]]

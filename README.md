# Relics of the Six Temples — Season 2

A 2D puzzle-platformer for the browser (HTML5 / WebGL). Arin explores six elemental temples — Jungle Ruins, Desert Temple, Crystal Caverns, Volcano Depths, Ice Mountains and the Sky Temple — across **48 hand-built levels** and **6 puzzle bosses**, recovering the seals that hold the Heart of the World together.

Built with **TypeScript (strict)**, **Phaser 3.90** and **Vite**. All art and audio are generated procedurally at boot (pixel art under stable asset IDs, WebAudio sound and music), so the game runs with no binary assets; real art can be dropped in later without code changes (see *Assets*).

## Quick start

```bash
npm install
npm run dev              # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload and debug tools enabled |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build on :4173 |
| `npm test` | Unit and simulation tests (Vitest, 160+ tests) |
| `npm run test:e2e` | Playwright browser tests (new-game flow + all 48 levels boot) |
| `npm run validate-levels` | Validate every level (reachability, dependencies, secrets, boss logic) |
| `npm run docs:levels` | Regenerate `LEVEL_SPEC.md` from the level data |
| `npm run typecheck` | `tsc --noEmit` |

## Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | A / D or ← / → | Left stick / D-pad | Virtual pad |
| Climb / interact up | W / ↑ | Up | Virtual pad |
| Crouch / drop through | S / ↓ | Down | Virtual pad |
| Jump | Space | A / Cross | Jump button |
| Interact | E | Y / Triangle | Interact button |
| Attack | F | X / Square | Attack button |
| Pause | Esc | Start | Tap the portrait (top-left) |

Keyboard bindings can be remapped in **Settings → Controls**. Settings also cover volume, screen shake, reduced motion, high contrast, touch-control size and graphics quality.

## Debug tools (development only)

Available in `npm run dev` (or with `?debug` in the URL); disabled in production builds.

| Key | Effect |
|---|---|
| F1 | Debug overlay (collision boxes, entity ids, active/powered signals, states) |
| F2 | Teleport to the next checkpoint |
| F3 | Solve the nearest puzzle |
| F4 | Collect all pickups / open chests |
| F5 | Restart the level |
| F6 | Toggle invulnerability |
| F7 | Level select |

`?level=3-4` jumps straight into an unlocked level in development.

## Project layout

```
src/
  core/        deterministic simulation (no Phaser): player, physics, entities, enemies, bosses, save, validator
  data/        levels (48 ASCII maps + data), i18n strings
  render/      Phaser scenes, views, procedural art, effects, UI
  input/       keyboard / gamepad / touch → InputState
  audio/       procedural SFX and music
tests/unit     simulation tests (players, objects, every level's key puzzles, every boss)
tests/e2e      Playwright smoke tests
scripts/       level validator, level-spec generator, dev helpers
```

See **ARCHITECTURE.md** for the design of the engine, **GAME_DESIGN.md** for the game design, **LEVEL_SPEC.md** for every level, and **PROJECT_PLAN.md** for the development plan.

## Assets

Every texture is registered under a stable key (e.g. `player_classic`, `tiles_jungle`, `boss_fire_dragon`). To replace generated art with real files, add entries to `ASSET_OVERRIDES` in `src/render/art/AssetRegistry.ts`; the loader will use the file and skip generation for that key.

## Saving

Progress is saved to `localStorage` (key `relics-six-temples.save`) with a versioned schema, migrations from older versions, default-merging for new fields, and quarantine of corrupt data (`…save.corrupt`) instead of silent loss.

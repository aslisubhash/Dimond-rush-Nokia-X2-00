# Architecture

The game is split into a **pure, deterministic simulation** (`src/core`) and a **read-only presentation layer** (`src/render`) built on Phaser. The simulation never imports Phaser; the renderer never mutates game state except through input.

```
 Input (keyboard / gamepad / touch)
          │  InputState (per frame)
          ▼
 GameScene ──► GameWorld.step(input)  ×N  (fixed 120 Hz)
          │         │
          │         ├─ Player FSM, Collision, Entities, Enemies, Boss
          │         ├─ Logic (signals → powered), Events → Triggers → Actions
          │         ├─ BeamSystem (light & lasers)
          │         └─ out: OutEvent[]  (sound, particles, shake, toast…)
          ▼
 WorldRenderer / Views / HUD / Audio  (read state + consume OutEvents)
```

## Simulation (`src/core`)

* **Fixed time step.** `SIM_DT = 1/120 s`. The scene accumulates *real* elapsed time (capped at 250 ms, at most 12 steps per frame), so behaviour is frame-rate independent and reproducible — every test drives the same code with scripted input.
* **Collision** (`physics/Collision.ts`): axis-separated AABB against the tile grid plus dynamic `SolidProvider`s (`full` or `top` one-way). Bodies may opt into `dropThrough` and `ladderTops` (standing on a ladder's top rung). Crushing between solids is detected.
* **Player** (`player/Player.ts`): a finite-state machine — IDLE, RUN, JUMP, FALL, LAND, CROUCH, SWIM, CLIMB, PUSH, PULL, HURT, ATTACK, DEATH, VICTORY — with coyote time, jump buffering, variable jump height, ice friction, wind drift, updraft lift, and safe-position tracking for pit recovery. Tunables live in `playerConfig.ts`.
* **Entities** (`entities/*`): ~60 types. Each extends `Entity` (position, props, `requires`, `active`, `powered`) and implements `update`, `interact`, `onAttack`, `onPowerChanged`, `handleAction`. `captureInitial/restoreInitial` snapshot primitive state for boss-arena and checkpoint resets.
* **Signals & logic.** Anything can be a source (`active`); anything with `requires` is powered by AND (or `logic: 'or'`) of its sources, with `unless` NOT-inputs and `invert`. `outputs` is authoring sugar that adds the source to targets' `requires`. This one mechanism wires plates to doors, receivers to bridges, guardians to ward gates, crystals to lifts, and so on.
* **Events → triggers → actions.** Entities fire typed events (`PLATE_PRESSED`, `LIGHT_RECEIVED`, `ENEMY_KILLED`, …). Level `triggers` match events and run `LevelAction`s (`OPEN_DOOR`, `RAISE_WATER`, `ROTATE_OBJECT`, `START`, …) against entity ids or `prefix*` groups; `rearm` triggers reset on respawn.
* **Beams** (`world/BeamSystem.ts`): grid ray tracer for light and lasers with mirrors, receivers, relay crystals and blocking solids; segments are pooled.
* **Enemies** (`enemies/`): 18 kinds sharing one FSM (IDLE, PATROL, CHASE, ATTACK, HURT, STUN, RETURN, DEAD) parameterised by `enemyKinds.ts`.
* **Bosses** (`bosses/`): a generic `Boss` controller runs data-driven phases (`pattern`, `enter` actions, `stunOn` signal, `exposed`, `afterStun`, `until` = hits / time / signal / allSignals, `hint` sequences). Six kind-specific *brains* only move the body and spawn attacks. Dying mid-fight resets the arena.
* **Levels** (`levels/`): ASCII maps plus a legend (tiles, fluids, marks) and per-level `marks`/`entities`, compiled by `LevelLoader`. The **validator** builds a traversal grid (supports, climbables, deadly cells, moving/rotating platforms, pushable-stone positions, magnet lifts, updrafts, drainable fluids) and runs a jump-envelope BFS, then checks exits, dependencies, doors, secrets metadata and boss soft-lock rules.
* **Save** (`save/`): versioned schema with migrations, default-merge and corrupt-save quarantine; `progression.ts` handles unlocks, stars and the continue point.

## Presentation (`src/render`)

* **Scenes:** Boot (texture generation) → Title → Story → WorldMap → Game (+ HUD, Pause, Settings, Results, LevelSelect).
* **WorldRenderer** owns the camera (dead-zone, look-ahead, arena lock), `TerrainRenderer` (autotiled tilemaps, back walls, decorations, rock covers over undiscovered secret rooms), `Backdrop` (parallax, light shafts, weather), `Lighting` (darkness render-texture for dark levels) and one `View` per entity.
* **Art** (`render/art/*`): pixel art drawn procedurally at 2× scale into canvases and registered under stable keys; `ASSET_OVERRIDES` swaps in real files.
* **Effects:** pooled particle presets, screen shake/flash with reduced-motion support.
* **Audio:** procedural WebAudio SFX and per-world music.

## Performance

Projectiles, beam segments and particles are pooled; tilemaps are culled by Phaser; the hot simulation loop avoids per-frame allocation. Quality “low” reduces weather and particle density.

## Testing

* `tests/unit` — simulation tests using `levelWorld(id)` and scripted input helpers (`walkTo`, `hopTo`, `climbTo`, `jump`). Every world has tests that actually play its key puzzles, secrets and boss fights.
* `tests/e2e` — Playwright: the full new-game flow in a real browser and a boot check for all 48 levels.
* `npm run validate-levels` — static level validation (runs in CI alongside tests).

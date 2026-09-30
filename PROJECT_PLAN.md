# Project Plan — Relics of the Six Temples (Season 2)

This plan follows the development order required by the brief: build, test, fix, verify, then continue.
Each phase lists its deliverables and how it is verified.

| Phase | Scope | Deliverables | Verification |
|---|---|---|---|
| 1 | Project setup | Vite + TypeScript (strict) + Phaser 3.90, Vitest, Playwright, folder layout | `npm run build`, `npm test` |
| 2 | Player movement | `Player` FSM (IDLE…VICTORY), fixed 120 Hz step, coyote time, jump buffer, variable jump | `tests/unit/player.test.ts` |
| 3 | Collision | Axis-separated AABB vs tile grid + dynamic solids, one-way platforms, crush detection | player/objects tests |
| 4 | Camera | Dead-zone follow, look-ahead, level clamp, boss arena lock, restrained shake | browser smoke test |
| 5 | Interactive objects | 40+ entity types in `src/core/entities` (blocks, plates, doors, platforms, fluids, beams, magnets, wind, hazards…) | `tests/unit/objects.test.ts` |
| 6 | Puzzle / event system | Signals (`requires`/`outputs`), level events, triggers → actions, sequence locks | objects + logic tests |
| 7 | Collectibles | Crystals, coins, relic fragments, temple keys, heart vessels, seals, chests | tests + HUD |
| 8 | Enemies | 18 enemy kinds, deterministic FSM (IDLE/PATROL/CHASE/ATTACK/HURT/STUN/RETURN/DEAD) | enemy tests |
| 9 | Save system | Versioned localStorage schema, migrations, defaults merge, corrupt-save quarantine | `tests/unit/save.test.ts` |
| 10 | UI | Title, story, world map, HUD, pause, settings (remap, accessibility), results, touch controls | e2e smoke |
| 11 | World 1 | 1-1 → 1-8 | validator + scripted playthrough tests |
| 12 | Boss system | Data-driven phases, stun sources, weak points, six boss "brains" | `tests/unit/boss.test.ts` |
| 13 | Worlds 2–6 | 40 further levels | `npm run validate-levels`, per-world simulation tests (`tests/unit/world*.test.ts`) |
| 14 | Optimization | pooling (projectiles, particles, beam segments), tilemap culling, no per-frame allocation in hot loops | FPS readout (F1) |
| 15 | QA | unit tests, validator, Playwright acceptance flow | `npm test`, `npm run validate-levels`, `npm run test:e2e` |

## Vertical slice order (as requested)

1. **1-1 Ancient Ruins** — player, jungle tiles, water, crystals, stone block, face stone, chest, enemy, checkpoint, exit, HUD, camera, death/respawn, secret.
2. **1-2 Mossy Passage** — pressure plate, movable stone, locked door, secret room.
3. **1-5 Water Gate** — water levels, floating platform, underwater secret.
4. **1-8 Jungle Guardian** — full boss system.
5. Remaining World 1 levels, then Worlds 2–6.

## Definition of done per level

* Validator passes with zero errors (spawn, exit, reachability, dependencies, secret metadata, boss logic).
* Level follows START → INTRODUCTION → MECHANIC → COMBINATION → CHALLENGE → SECRET → CHECKPOINT → FINAL PUZZLE → EXIT.
* A new mechanic is never introduced in the hardest section.
* The secret documents WHY / CLUE / ACTION / REWARD.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| No final art | Procedural pixel-art generator registered under stable asset IDs; `ASSET_OVERRIDES` swaps in real files without code changes |
| Soft-locks in physics puzzles | Blocks return home when lost; pause menu "Restart from checkpoint" resets movable stones; validator reachability |
| Frame-rate dependence | Fixed-step simulation (120 Hz) with accumulator; renderer interpolation-free and read-only |
| Mobile performance | Quality setting (low disables weather density), pooled particles, tilemap culling |

## Status

All phases are complete:

* **48 levels** across six worlds, each validated (0 errors, 0 warnings) and each world covered by scripted simulation tests of its key puzzles, secrets and boss.
* **6 bosses** with multi-phase puzzle fights, each beaten end-to-end in `tests/unit/boss.test.ts`.
* **166 unit/simulation tests**, **2 Playwright e2e tests** (full new-game flow; all 48 levels boot without errors).
* Docs: README, GAME_DESIGN, ARCHITECTURE, LEVEL_SPEC (generated from data).

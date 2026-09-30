# Game Design — Relics of the Six Temples (Season 2)

## Premise

Long ago six temples were raised to protect the **Heart of the World**, divided into six elemental seals — Verdant, Sun, Crystal, Flame, Frost and Sky. The seals are slipping and the guardians have awoken. **Arin**, an explorer who has studied the ruins for years, sets out to recover them before the Heart becomes unstable.

## Pillars

1. **Puzzles you can read.** Every mechanism shows its state (glowing receivers, lit braziers, ticking switches, flashing chimes). Nothing depends on hidden information.
2. **Observation is rewarded.** Secrets are designed, not scattered: each has a reason to exist, a visible clue and a mechanic that reveals it.
3. **Teach, combine, test.** Each level follows *start → introduction → mechanic → combination → challenge → secret → checkpoint → final puzzle → exit*. A new mechanic is never introduced in the hardest section.
4. **Fair failure.** Four hearts, checkpoints before every hard section, pits cost one heart and return Arin to safe ground, dying mid-boss resets the arena, and “Restart from checkpoint” resets movable stones so nothing can soft-lock.

## Player

Walk, run (default), jump (variable height, coyote time, buffered input), fall, crouch/crawl, climb ladders and vines, swim and dive, push and pull stones, use switches, levers and valves, carry keys, interact and attack. States: IDLE, RUN, JUMP, FALL, LAND, CROUCH, SWIM, CLIMB, PUSH, PULL, HURT, ATTACK, DEATH, VICTORY. Movement is deterministic (fixed 120 Hz simulation) and tuned to feel responsive.

**Health:** 4 hearts; heart vessels (one per world, from each boss level’s secret) add a heart. Damage sources: enemies, spikes, lava, falling stones, crushing walls, lasers, freezing water, icicles and fire. On death: animation, particles, short freeze, fade, respawn at the latest checkpoint.

## Collectibles

| Item | Where | Purpose |
|---|---|---|
| Purple crystal | 3–8 per normal level | Completion rating (stars) |
| Ancient coin | Levels and chests | Statistics and lore |
| Relic fragment | 3 per world (levels X-1, X-5, X-7), always behind a secret | All three unlock the world’s lore room |
| Temple key | 1 per world (level X-3), behind a secret | Opens the Temple Door in X-6 |
| Legendary chest | Behind each Temple Door (X-6) | Unlocks an outfit (verdant, sun, crystal, flame, frost, celestial) |
| Heart vessel | Each boss level’s secret | +1 max heart |
| Elemental seal | Reward for each boss | Story progression |

Every pickup has collision, a pickup animation, sound, particle burst, HUD update and save persistence. Unique items are banked the moment they are collected.

## Secrets

Five designed types, each documented in data with **why / clue / discovery method / required mechanic / reward**:

* **A — False wall:** cracked, differently coloured or hollow-sounding wall; strike it.
* **B — Water secret:** raising, lowering or draining water (or lava) reveals an entrance.
* **C — Environmental:** place something somewhere unusual (a stone down a shaft, a plug lifted by a magnet, an icicle dropped on an ice plug).
* **D — Timing:** reach an area before a temporary mechanism resets (timed switches, fading bridges, fleeting cloud stairs).
* **E — Chain:** activate things in the order a clue shows (torches, glyphs, chimes, constellations, braziers).

Enclosed secret rooms are drawn covered by rock until Arin first enters them. Finding a secret shows “Secret discovered!” and is recorded in the results screen and save.

## Worlds

| World | Theme | New mechanics | Boss |
|---|---|---|---|
| 1 Jungle Ruins | Overgrown temple | Stone blocks, face stones, plates, keys, torches, water levels, floats, vines, crumbling floors, rolling boulder | **Giant Serpent** — raise the water, redirect the waterfall onto the crystal, stun, strike the weak point |
| 2 Desert Temple | Sun temple in the dunes | Sand, quicksand, shifting sand, sand falls, mirrors and sunlight, crushers, glyph sequences | **Sand King** — route sunlight through mirrors into his gem as he sabotages them |
| 3 Crystal Caverns | Glowing mines | Crystal nodes (strike, light, timed), relays, darkness and braziers, crystal lifts, echo stones, magnets, lasers, crystal bridges | **Crystal Titan** — repeat the melody its crystals pulse; the song lengthens each phase |
| 4 Volcano Depths | Magma forges | Lava, falling and moving platforms, rotating platforms, cooling valves, fire jets, flame wheels, rising lava | **Fire Dragon** — survive, then climb to both cooling valves while lava floods the arena to ground it |
| 5 Ice Mountains | Frozen peaks | Ice floors, icicles, thin ice, ice blocks, freezing water, dams, wind, updrafts, sails, blizzards and shelter | **Ice Dragon** — shake the great icicle loose above its current perch |
| 6 Sky Temple | Floating islands | Bottomless sky, cloud rhythms, fan-driven sails, ward gates, light beams, celestial rings | **Sky Deity** — six phases: storm, pylons, shield beam, ring mirrors, exposed Heart Seal |

Level names and details: see **LEVEL_SPEC.md**.

## Bosses

Bosses are puzzle fights built on the same entity and signal system as the levels: **observation → mechanic → counterplay → vulnerability**. Each phase declares its attack pattern, the signal that stuns the boss (or that the weak point is exposed), actions on entering the phase and after a stun, and its end condition. Phases escalate by adding pressure, never by hiding the rule. A health bar shows overall progress; a toast names each new phase.

## Enemies

Eighteen kinds (three per world: walker, flyer, shooter) share one state machine — IDLE, PATROL, CHASE, ATTACK, HURT, STUN, RETURN, DEAD — with per-kind speed, health, stompability, lunges and projectiles. Heavy objects (rolling stones, icicles) crush them. In the Sky Temple, ward gates bind guardians: the gate opens when all of them fall.

## Progression and results

Levels unlock in order; perfection is never required. Results show time, crystals (stars), coins, secrets, relics and damage, with best records kept. The world map shows completion per level and the lore room status for each world.

## Accessibility and options

Remappable keyboard controls, gamepad and multi-touch virtual controls (adjustable size, auto/on/off), master/music/SFX volume, screen-shake toggle, reduced motion, high-contrast mode, low-quality mode. All text lives in `src/data/i18n` for localisation.

## Audio and visuals

Procedural pixel art (2× scale), parallax backdrops per world with weather (leaves, sand, motes, embers, snow, blizzard, clouds), lighting for dark levels, pooled particle effects, procedural sound effects and per-world music.

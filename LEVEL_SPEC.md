# Level Specification — Relics of the Six Temples (Season 2)

> Generated from `src/data/levels` by `npm run docs:levels`. Do not edit by hand.

Every level follows START → INTRODUCTION → MECHANIC → COMBINATION → CHALLENGE → SECRET → CHECKPOINT → FINAL PUZZLE → EXIT, and passes `npm run validate-levels` (spawn, exit, reachability, dependencies, secret metadata, boss logic).

| Level | Name | Size (tiles) | Crystals | Checkpoints | Enemies | Mechanics | Unique pickups |
|---|---|---|---|---|---|---|---|
| 1-1 | Ancient Ruins | 124×23 | 5 | 1 | 2 | movement, jump, crystals, push_block, face_stone, attack, checkpoint, false_wall | relic |
| 1-2 | Mossy Passage | 108×23 | 7 | 1 | 3 | crouch, pull_block, pressure_plate, key, locked_door | — |
| 1-3 | Hidden Chamber | 100×23 | 5 | 1 | 2 | torch, sequence_lock, observation, chain_secret | temple key |
| 1-4 | Rotating Stones | 120×23 | 7 | 1 | 1 | face_stone, pressure_plate, slot | — |
| 1-5 | Water Gate | 90×23 | 7 | 1 | 2 | water_level, float_platform, water_current, swim, dive | relic |
| 1-6 | Vine Lift | 60×40 | 5 | 1 | 2 | climb, vine, ladder, moving_platform, lever, temple_door | legendary chest |
| 1-7 | Collapsing Floor | 130×23 | 5 | 1 | 0 | crumbling_block, falling_platform, rolling_stone, timing | relic |
| 1-8 | Jungle Guardian (boss) | 70×23 | 1 | 1 | 0 | boss, waterfall, crystal_node, switch, lever | seal, heart vessel |
| 2-1 | Sand Entrance | 110×23 | 5 | 1 | 4 | sand, quicksand | relic |
| 2-2 | Shifting Sands | 100×23 | 6 | 1 | 3 | shifting_sand, quicksand, timing | — |
| 2-3 | Sunken Tomb | 100×24 | 5 | 1 | 4 | face_stone, pressure_plate, shifting_sand, swim, key | temple key |
| 2-4 | Sand Falls | 110×30 | 6 | 1 | 4 | sand_fall, ladder, timing | — |
| 2-5 | Mirror Hall | 100×23 | 5 | 2 | 2 | mirror, light_source, light_receiver | relic |
| 2-6 | Moving Walls | 100×24 | 7 | 1 | 2 | moving_wall, timed_switch, crusher, temple_door | legendary chest |
| 2-7 | Ankh Puzzle | 120×23 | 5 | 2 | 5 | glyph_switch, sequence_lock, timed_switch, quicksand | relic |
| 2-8 | Desert King (boss) | 62×23 | 0 | 1 | 0 | boss, mirror, light_receiver | heart vessel, seal |
| 3-1 | Crystal Entrance | 110×23 | 5 | 1 | 3 | crystal_node, relay, timing | relic |
| 3-2 | Dark Mines | 110×29 | 5 | 1 | 3 | darkness, brazier, fire_source | — |
| 3-3 | Crystal Lift | 50×45 | 5 | 1 | 4 | crystal_node, crystal_lift, timing | temple key |
| 3-4 | Echo Cave | 96×20 | 7 | 2 | 3 | echo_stone, sequence, audio_clue | — |
| 3-5 | Magnet Stones | 100×24 | 7 | 2 | 2 | magnet, magnet_stone, polarity | relic |
| 3-6 | Laser Grid | 100×22 | 8 | 2 | 2 | laser, mirror, crawl, stone_block | legendary chest |
| 3-7 | Crystal Bridge | 110×26 | 6 | 2 | 2 | crystal_node, bridge, light, timing | relic |
| 3-8 | Crystal Titan (boss) | 100×24 | 4 | 1 | 2 | boss, sequence, echo_stone, timing | heart vessel, seal |
| 4-1 | Lava Entrance | 104×24 | 6 | 2 | 6 | lava, falling_platform, enemies | relic |
| 4-2 | Moving Platforms | 110×24 | 7 | 1 | 3 | moving_platform, rotating_platform, lever, timing | — |
| 4-3 | Lava Flow | 100×28 | 5 | 1 | 5 | lava, valve, fire_jet, crumbling_block | temple key |
| 4-4 | Fire Shafts | 72×46 | 8 | 2 | 1 | fire_jet, ladder, timed_switch, brazier | — |
| 4-5 | Heat Maze | 60×36 | 6 | 2 | 3 | fire_wheel, fire_jet, lever, ladder, stone_block, pressure_plate | relic |
| 4-6 | Rising Lava | 40×72 | 8 | 2 | 3 | rising_lava, ladder, crumbling_block, moving_platform, temple_door | legendary chest |
| 4-7 | Flame Wheels | 100×22 | 6 | 1 | 2 | fire_wheel, timed_switch, moving_platform | relic |
| 4-8 | Fire Dragon (boss) | 64×26 | 5 | 1 | 0 | boss, valve, rising_lava, platforming | heart vessel, seal |
| 5-1 | Snow Approach | 110×26 | 5 | 1 | 4 | ice, icicle, thin_ice, ice_block, swim | relic |
| 5-2 | Ice Slides | 104×24 | 6 | 1 | 2 | ice, ice_block, stone_block, pressure_plate, brazier, thin_ice | — |
| 5-3 | Frozen Lake | 100×26 | 5 | 1 | 2 | thin_ice, cold_water, float_platform, water_level, lever | temple key |
| 5-4 | Wind Cavern | 96×36 | 7 | 2 | 2 | wind, updraft, wind_platform | — |
| 5-5 | Falling Ice | 100×24 | 5 | 1 | 3 | icicle, enemies, lever, ice_block | relic |
| 5-6 | Ice Lifts | 48×62 | 6 | 1 | 3 | moving_platform, ice, lever, updraft, temple_door | legendary chest |
| 5-7 | Blizzard Path | 122×24 | 6 | 2 | 3 | wind, shelter, brazier, timing, enemies | relic |
| 5-8 | Ice Dragon (boss) | 64×28 | 4 | 1 | 0 | boss, icicle, switch, platforming | heart vessel, seal |
| 6-1 | Floating Islands | 120×30 | 6 | 1 | 5 | platforming, moving_platform, crumbling_block, enemies | relic |
| 6-2 | Cloud Passage | 112×30 | 6 | 2 | 4 | phase_bridge, crumbling_block, updraft, timing | — |
| 6-3 | Wind Platforms | 120×30 | 6 | 2 | 4 | wind_platform, wind, sequence | temple key |
| 6-4 | Sky Guardians | 110×30 | 6 | 2 | 8 | enemies, ward_gate, moving_platform | — |
| 6-5 | Light Beams | 112×30 | 5 | 2 | 4 | light, mirror, light_receiver, crystal_node, lever | relic |
| 6-6 | Rotating Rings | 100×28 | 6 | 2 | 2 | rotating_platform, switch, timed_switch, temple_door | legendary chest |
| 6-7 | Celestial Path | 122×30 | 6 | 3 | 3 | stone_block, mirror, crystal_node, fire_jet, updraft, wind, echo_stone | relic |
| 6-8 | Sky Deity (boss) | 60×30 | 1 | 0 | 0 | boss, crystal_node, mirror, lever, light | heart vessel, seal |

## World 1 — Jungle Ruins

### 1-1 Ancient Ruins

Teach walking, jumping, swimming, pushing a block, rolling a face stone, attacking, checkpoints and the idea that walls can hide rooms.

* **Mechanics:** movement, jump, crystals, push_block, face_stone, attack, checkpoint, false_wall
* **Par time:** 150s
* **Secret `offering_niche`** (type false_wall, difficulty 1, reward `relic_1`)
  * Why: The temple builders sealed their offering niche behind a thin plaster wall.
  * Clue: A corridor ends in a dead end with a lone crystal as lure; the end wall is cracked and its moss is brighter than the stone around it.
  * Discovery: Face the cracked wall and press Interact, or strike it — it sounds hollow.

### 1-2 Mossy Passage

Teach crouching, pulling a stone out of a recess onto a heavy pressure plate, keys and locked doors, then combine pushing with falling.

* **Mechanics:** crouch, pull_block, pressure_plate, key, locked_door
* **Par time:** 170s
* **Secret `moss_alcove`** (type false_wall, difficulty 1, reward `crystal_secret`)
  * Why: Pilgrims hid offerings in a recess and sealed it with the heavy stone that now blocks it.
  * Clue: The stone sits flush in a recess; once it is dragged away the wall behind it is cracked and freshly mossed.
  * Discovery: Pull the stone out (hold Interact and walk away), then inspect or strike the cracked wall.

### 1-3 Hidden Chamber

Teach observation: a mural of lit torches (tall, medium, short flames over three glyphs) encodes the order for the chamber torches. A lone unlit torch among lit ones hints at a chain secret.

* **Mechanics:** torch, sequence_lock, observation, chain_secret
* **Par time:** 160s
* **Secret `torch_vault`** (type chain, difficulty 2, reward `temple_key_1`)
  * Why: The chamber priests sealed the Temple Key vault so it opens only for those who both read the mural and relight the forgotten torch.
  * Clue: In a corridor of burning torches a single torch is cold; the corridor dead-ends at an ornate wall that glitters.
  * Discovery: Solve the flame-order puzzle, then light the lone unlit torch — the ornate wall slides away.

### 1-4 Rotating Stones

Introduce rolling face stones: they roll down stairs, drop into one-tile plate slots, and can bridge a trap slot so a second stone reaches the wall as a step.

* **Mechanics:** face_stone, pressure_plate, slot
* **Par time:** 170s
* **Secret `stone_gallery`** (type false_wall, difficulty 1, reward `crystal_upper`)
  * Why: The stone-carvers kept a gallery above the rolling hall to watch the stones run.
  * Clue: Wooden steps rise from the exit ledge toward nothing — and end at a cracked, freshly mossed wall.
  * Discovery: Climb the steps above the exit ledge and inspect the cracked wall.

### 1-5 Water Gate

Introduce controllable water levels: rising water lifts a floating platform; lowering water disables a current. A ripple marks an underwater tunnel.

* **Mechanics:** water_level, float_platform, water_current, swim, dive
* **Par time:** 180s
* **Secret `sunken_shrine`** (type water, difficulty 2, reward `relic_5`)
  * Why: The water gate once flooded a shrine beneath the lever house; its offering was never recovered.
  * Clue: A constant ripple on the basin surface right beside the left wall, where nothing else disturbs the water.
  * Discovery: Dive (hold Down) beneath the ripple and swim left through the flooded tunnel.

### 1-6 Vine Lift

Introduce climbing on vines and ladders in safe rooms, then a lever-operated vine elevator, then a vine-to-vine traverse that combines climbing with jumping.

* **Mechanics:** climb, vine, ladder, moving_platform, lever, temple_door
* **Par time:** 190s
* **Secret `canopy_loft`** (type environmental, difficulty 2, reward `crystal_loft`)
  * Why: Temple gardeners stored seeds and offerings in a loft reached only by the oldest vine.
  * Clue: Every other vine hangs down from the ceiling — the top-left vine instead grows up into it, and leaves glitter where it disappears.
  * Discovery: Climb the top-left vine past the exit and up through the ceiling.

### 1-7 Collapsing Floor

Introduce temporary platforms (crumbling floors, falling ledges) in safe spots, then combine them with a boulder chase. The final slab hides a room beneath its cracked heart.

* **Mechanics:** crumbling_block, falling_platform, rolling_stone, timing
* **Par time:** 150s
* **Secret `hollow_slab`** (type timing, difficulty 2, reward `relic_7`)
  * Why: The last slab of the collapsing hall was hollowed out to hide the builders’ final offering from looters rushing for the exit.
  * Clue: The slab before the exit has a cracked heart, and a faint glimmer shows through the cracks from below.
  * Discovery: Instead of running across, stop on the cracked heart of the slab and let it give way.

### 1-8 Jungle Guardian

Boss: apply every World 1 lesson (switches, levers, waterfalls, crystals, timing) to defeat the Giant Serpent.

* **Mechanics:** boss, waterfall, crystal_node, switch, lever
* **Par time:** 240s
* **Secret `guardian_offering`** (type false_wall, difficulty 1, reward `heart_vessel_1`)
  * Why: Priests left a vessel of life behind the antechamber wall for those brave enough to face the guardian.
  * Clue: Arin starts facing away from a cracked wall with a faint draft of sparkles seeping through it.
  * Discovery: Turn around, inspect or strike the cracked wall behind the starting point.
* **Boss:** THE JUNGLE GUARDIAN — GIANT SERPENT
  1. `awaken` pattern `emerge_bite`, ends after signal falls_b — “The serpent's scales are unbreakable. The temple must help you.”
  2. `crystal` pattern `emerge_bite`, stunned by `cr_heart`, ends after 2 hit(s) — “The crystal is exposed! Charge it while the serpent is out of the water.”
  3. `enraged` pattern `bite_spit`, stunned by `cr_heart`, ends after 2 hit(s) — “The guardian is enraged!”

## World 2 — Desert Temple

### 2-1 Sand Entrance

Teach sand movement: sand surfaces slow running, quicksand sinks you until you jump out. Introduce scarabs, mummies and spear-throwing sand warriors.

* **Mechanics:** sand, quicksand
* **Par time:** 150s
* **Secret `sphinx_heart`** (type false_wall, difficulty 1, reward `relic_2_1`)
  * Why: Tomb builders hid a votive tablet inside the guardian sphinx’s chest.
  * Clue: Only one of the sphinx’s eyes still glitters, directly above a cracked patch in its chest.
  * Discovery: Inspect or strike the cracked stone below the glittering eye.

### 2-2 Shifting Sands

Introduce shifting sand columns as slow elevators, then time hops across a wave of columns over a quicksand sea. Low tide exposes what high tide hides.

* **Mechanics:** shifting_sand, quicksand, timing
* **Par time:** 170s
* **Secret `low_tide_cache`** (type timing, difficulty 2, reward `crystal_tide`)
  * Why: Caravan traders hid their tolls in a hollow the dunes only uncover at low tide.
  * Clue: As the last column sinks, a dark hollow and a glint appear in the ledge wall beside it.
  * Discovery: Ride the last sand column down to low tide and step into the hollow before it rises again.

### 2-3 Sunken Tomb

Combine rolling face stones with shifting sand: filling two vent slots drains the sand plugging the tomb shaft. Inside, a half-flooded crypt and a key-locked burial chamber.

* **Mechanics:** face_stone, pressure_plate, shifting_sand, swim, key
* **Par time:** 190s
* **Secret `drowned_crypt`** (type water, difficulty 2, reward `temple_key_2`)
  * Why: The high priest’s crypt flooded when the oasis broke through; his Temple Key still lies inside.
  * Clue: Bubbles and a lasting ripple rise at the left edge of the crypt pool.
  * Discovery: Dive to the bottom of the pool and swim left through the flooded passage.

### 2-4 Sand Falls

Timing: sand pours over every ladder on a fixed rhythm and knocks climbers down. Watch the rhythm, wait at the base, climb between pours. A permanent fall hides a cave.

* **Mechanics:** sand_fall, ladder, timing
* **Par time:** 160s
* **Secret `veiled_cave`** (type environmental, difficulty 1, reward `crystal_falls`)
  * Why: Sand priests carved a meditation cell into the cliff and let a never-ending fall of sand hide its door.
  * Clue: Unlike every other fall, this one never stops — and something glints through it at the base of the cliff.
  * Discovery: Walk straight into the endless sandfall at the foot of the high cliff.

### 2-5 Mirror Hall

Introduce mirrors: one mirror, then two, then a six-mirror route. Misrouting one mirror on purpose lights a forgotten sun disk.

* **Mechanics:** mirror, light_source, light_receiver
* **Par time:** 200s
* **Secret `forgotten_disk`** (type environmental, difficulty 3, reward `relic_2_5`)
  * Why: The hall’s first sun disk was walled into a dark corner when the mirrors were rebuilt; it still answers to light.
  * Clue: A dull sun disk sits in the dark lower corner beneath a sun glyph, and an alcove with a chest hangs out of reach above it.
  * Discovery: Turn the lower mirror so the sunlight runs back along the floor into the dark disk — a bridge of light forms to the alcove.

### 2-6 Moving Walls

Walls move by switches: first a simple lever wall, then a timed switch that holds the far wall open while crushers cycle. A recess between the crushers is safe — and hides a cracked wall.

* **Mechanics:** moving_wall, timed_switch, crusher, temple_door
* **Par time:** 150s
* **Secret `crusher_recess`** (type timing, difficulty 2, reward `crystal_recess`)
  * Why: Crusher engineers needed a safe pit to shelter in during maintenance — and a locker to keep their pay.
  * Clue: Between the crushers the floor drops into a pit the pistons never reach; its left wall is cracked.
  * Discovery: Drop into the safe pit between crusher cycles and inspect the cracked wall.

### 2-7 Ankh Puzzle

Observation across a whole level: each room carries one faint glyph on its back wall. The glyph chamber must be activated in the order the glyphs were passed. A timed switch races to a hidden door.

* **Mechanics:** glyph_switch, sequence_lock, timed_switch, quicksand
* **Par time:** 210s
* **Secret `hasty_door`** (type timing, difficulty 3, reward `relic_2_7`)
  * Why: A priest’s hidden cell could only be opened by a runner — the switch releases the door for a few heartbeats.
  * Clue: A floor switch ticks when pressed, and far across the quicksand a stretch of wall above a ledge trembles in time with it.
  * Discovery: Press the switch, then race over the stepping stones and up to the ledge before the ticking stops.

### 2-8 Desert King

Boss: the Sand King only exposes his gem when sunlight reaches the sun disk above his throne. After every stun he spins a mirror, so the route must be rebuilt under sand waves and sand rain.

* **Mechanics:** boss, mirror, light_receiver
* **Par time:** 260s
* **Secret `ladder_to_nowhere`** (type false_wall, difficulty 1, reward `heart_vessel_2`)
  * Why: Throne-room servants kept a reliquary above the antechamber, reached by a ladder that seems to lead nowhere.
  * Clue: A ladder climbs into a tiny dead-end nook — and the nook’s back wall is cracked.
  * Discovery: Climb the ladder and inspect the cracked wall of the nook.
* **Boss:** THE ANCIENT SAND KING
  1. `waves` pattern `sand_wave`, stunned by `rx_disk`, ends after 2 hit(s) — “His gem hides in shadow. Bring him the sun.”
  2. `rain` pattern `sand_rain`, stunned by `rx_disk`, ends after 2 hit(s) — “The king turns the mirrors against you!”
  3. `storm` pattern `both`, stunned by `rx_disk`, ends after 2 hit(s) — “The throne room trembles!”

## World 3 — Crystal Caverns

### 3-1 Crystal Entrance

Introduce crystal activation: a struck crystal powers a gate, a relay crystal beams energy to another crystal, and two short-lived crystals must be charged together across a spike field.

* **Mechanics:** crystal_node, relay, timing
* **Par time:** 160s
* **Secret `dark_crystal`** (type environmental, difficulty 1, reward `relic_3_1`)
  * Why: The miners sealed their shrine with a lock keyed to the one crystal they let go dark.
  * Clue: Beside the exit, a dark crystal stands between two brightly glowing ones.
  * Discovery: Strike the dark crystal — the wall past the exit slides open.

### 3-2 Dark Mines

Limited visibility: Arin’s lantern shows only a little. Braziers reveal hidden spike pits and power the mine gate when all three burn. A draft in the dark floor hints at a cellar.

* **Mechanics:** darkness, brazier, fire_source
* **Par time:** 180s
* **Secret `miners_cellar`** (type environmental, difficulty 2, reward `crystal_cellar`)
  * Why: Miners stored their wages in a cellar beneath the lower tunnel, reached through a narrow shaft.
  * Clue: Sparks drift up from one spot of the dark tunnel floor — a draft from below.
  * Discovery: Light your way along the lower tunnel and drop through the narrow hole where the sparks rise.

### 3-3 Crystal Lift

Crystal-powered lifts rise while their crystal is charged and sink when it fades. The last lift’s crystal is far away: strike it and sprint. A hollow wall hides a vault lift.

* **Mechanics:** crystal_node, crystal_lift, timing
* **Par time:** 170s
* **Secret `crystal_vault`** (type false_wall, difficulty 2, reward `temple_key_3`)
  * Why: The mine foremen kept the Temple Key in a vault reached by their own private lift.
  * Clue: Striking the far wall of the lower chamber makes a hollow echo instead of a dull thud, and a crack runs through it.
  * Discovery: Break through the hollow wall, charge the purple crystal and ride the hidden lift up.

### 3-4 Echo Cave

A listening puzzle: echo stones replay a melody over chime crystals and each gate opens only when the melody is repeated. A wall that sounds hollow hides a cache.

* **Mechanics:** echo_stone, sequence, audio_clue
* **Par time:** 150s
* **Secret `hollow_cache`** (type false_wall, difficulty 2, reward `crystal_hollow`)
  * Why: Miners walled up a tool cache behind a thin slab so the echo priests would not hear them working.
  * Clue: The cave rings with echoes — striking this slab above the spikes gives a hollow knock instead of a dull one, and a hairline crack runs beneath it.
  * Discovery: Climb the ledges over the spikes to the top step and strike the slab to break through.

### 3-5 Magnet Stones

Magnets move stones Arin cannot reach: pull one over spikes onto a plate, ride one up a cliff, then flip polarity to fling one across a spike field. A veined stone plugging the cliff top hides the relic.

* **Mechanics:** magnet, magnet_stone, polarity
* **Par time:** 160s
* **Secret `veined_plug`** (type environmental, difficulty 2, reward `relic_3_5`)
  * Why: The miners sealed their relic store with a magnet stone so only someone who understood the magnets could open it.
  * Clue: A red-veined magnet stone sits flush in the cliff top under a silent hanging magnet, with a lever beside it that seems to do nothing.
  * Discovery: Pull the lever: the hanging magnet lifts the plug stone and reveals a ladder down into the cliff.

### 3-6 Laser Grid

Lasers teach timing (pulsing curtains), posture (crawl under a head-height beam), redirection (levers flip mirrors to power a laser lock) and shielding (push a stone into the beam). The Temple Door hides the legendary chest.

* **Mechanics:** laser, mirror, crawl, stone_block
* **Par time:** 180s
* **Secret `behind_the_start`** (type false_wall, difficulty 1, reward `crystal_behind`)
  * Why: The laser wardens stored spare lenses just inside the entrance, behind a thin plaster seal.
  * Clue: The wall right behind the starting point is cracked and its bricks are a lighter shade than the cave rock.
  * Discovery: Turn around at the start and strike the cracked wall.

### 3-7 Crystal Bridge

Charged crystals project bridges across spike chasms for a few seconds. Chains of bridges demand a sprint, a redirected light beam holds the long bridge steady, and dropping through that bridge reveals the relic ledge.

* **Mechanics:** crystal_node, bridge, light, timing
* **Par time:** 150s
* **Secret `under_the_bridge`** (type environmental, difficulty 3, reward `relic_3_7`)
  * Why: The bridge keepers hid their relic where only someone who trusted the steady light bridge would look: beneath it.
  * Clue: While the long bridge is held by the lamp, a glint flickers on a ledge below its far end, just above the spikes.
  * Discovery: Hold the long bridge with the lamp, then drop through it ({down} + {jump}) onto the ledge and crawl into the alcove.

### 3-8 Crystal Titan

Boss. The Titan flashes a melody across four chime crystals. Striking them in the same order cracks its armour and exposes the heart crystal. Each phase lengthens the melody while stomps and shard volleys pressure the player.

* **Mechanics:** boss, sequence, echo_stone, timing
* **Par time:** 240s
* **Secret `titan_shelf`** (type timing, difficulty 3, reward `heart_vessel_3`)
  * Why: The Titan’s keepers stored a heart vessel on a shelf reached only by a short-lived crystal bridge.
  * Clue: A lone purple crystal stands near the entrance, and high on the left wall a glint shines beside a narrow hole.
  * Discovery: Strike the crystal, climb the ledge, cross the bridge before it fades and crawl through the hole.
* **Boss:** THE CRYSTAL TITAN
  1. `song1` pattern `stomp`, stunned by `seq_p1`, ends after 1 hit(s) — “Watch its crystals. They pulse in a pattern.”
  2. `song2` pattern `shard_throw`, stunned by `seq_p2`, ends after 1 hit(s) — “The pattern has changed!”
  3. `song3` pattern `fury`, stunned by `seq_p3`, ends after 2 hit(s) — “The Titan rages — the longest song of all!”

## World 4 — Volcano Depths

### 4-1 Lava Entrance

Introduces lava as instant danger: short pits, then falling platforms across a lava lake, then basalt stepping stones under fire bats. A cooled basalt mesa sounds hollow on its far side.

* **Mechanics:** lava, falling_platform, enemies
* **Par time:** 140s
* **Secret `hollow_mesa`** (type false_wall, difficulty 1, reward `relic_4_1`)
  * Why: Early explorers dug a cache into the cooled basalt mesa and sealed it with rubble.
  * Clue: The mesa’s far face is a lighter, cracked grey and no heat shimmer rises from it.
  * Discovery: Drop off the mesa onto the narrow ledge and strike the cracked face.

### 4-2 Moving Platforms

Every kind of moving platform over lava: a sliding ferry, a lift up a cliff, twin rotating wheels and a lever-driven ferry. A timed switch sends a hidden lift to a shelf cache.

* **Mechanics:** moving_platform, rotating_platform, lever, timing
* **Par time:** 150s
* **Secret `shelf_lift`** (type timing, difficulty 2, reward `crystal_shelf`)
  * Why: Forge workers rode a quick lift to a tool shelf; the switch only holds it up for a few seconds.
  * Clue: A small switch sits beside a platform set flush into the rock, and an arrow is scratched above it pointing at the ceiling.
  * Discovery: Press the switch, step onto the flush platform at once and walk onto the shelf before the lift sinks.

### 4-3 Lava Flow

Cooling valves drain lava pools: the first opens a tunnel at the bottom of the pool, the second empties a pit to walk across. Lava falls pulse from the ceiling. A seal under the start ledge only opens once the first pool is dry — the Temple Key waits inside.

* **Mechanics:** lava, valve, fire_jet, crumbling_block
* **Par time:** 160s
* **Secret `lava_vault`** (type water, difficulty 2, reward `temple_key_4`)
  * Why: The forge masters kept the Temple Key in a vault that was only reachable during maintenance, when the pool was drained.
  * Clue: A carved seal is visible just below the lava line on the pool’s left wall, and it glows when the valve is turned.
  * Discovery: Drain the pool with the valve, drop to the bottom and walk left through the opened seal instead of right.

### 4-4 Fire Shafts

Fire vents warn with sparks before they erupt. A rolling wave of floor jets teaches the warning, a tall ladder shaft is crossed by side jets (rest on the landings), and a timed switch shuts the last vent row just long enough. Three braziers lit in the carved order open a hidden cache.

* **Mechanics:** fire_jet, ladder, timed_switch, brazier
* **Par time:** 150s
* **Secret `brazier_order`** (type chain, difficulty 2, reward `crystal_cache`)
  * Why: The vent keepers sealed their cache with a fire rite: the braziers must be lit in the carved order.
  * Clue: Each unlit brazier has a carving above it — the first near the start, the other two past the vents — and the wall behind the start is scorched in a door shape.
  * Discovery: Light the brazier by the start first, then the nearer of the far pair, then the last one.

### 4-5 Heat Maze

A stacked maze of furnace corridors linked by ladders. Flame wheels guard optional branches, a lever douses the wheel that blocks the way, and a wave of vents guards the last climb. A stone in a dead end is the key to the relic: drop it down the ladder shaft onto the plate below.

* **Mechanics:** fire_wheel, fire_jet, lever, ladder, stone_block, pressure_plate
* **Par time:** 170s
* **Secret `stone_down_the_shaft`** (type environmental, difficulty 3, reward `relic_4_5`)
  * Why: The furnace keepers opened their relic store by dropping a counterweight stone down the service shaft.
  * Clue: A stone sits alone in a dead end right beside a ladder shaft, drag marks lead to the shaft, and a plate lies at the shaft’s foot below a scorched door.
  * Discovery: Walk past the stone, push it back into the ladder shaft so it drops onto the plate one floor down, then return to the opened door.

### 4-6 Rising Lava

A vertical escape: once Arin starts climbing, magma rises through the tower. Ledges, a ladder, a crumbling walkway and a lift must be taken without hesitation; checkpoints reset the magma a safe distance below. The Temple Door at the base guards the legendary chest.

* **Mechanics:** rising_lava, ladder, crumbling_block, moving_platform, temple_door
* **Par time:** 120s
* **Secret `tower_niche`** (type false_wall, difficulty 2, reward `crystal_tower`)
  * Why: The tower builders left a cool niche in the outer wall to store water skins for the climb.
  * Clue: Beside a short ledge the tower wall is cracked, and no heat glow shows on it even as the magma rises.
  * Discovery: From the first checkpoint shelf hop onto the short ledge on the right and strike the cracked wall.

### 4-7 Flame Wheels

Rotating flame wheels: a single arm to time, a wheel over a lava ferry, twin counter-rotating wheels that only a timed valve can douse, and a three-armed great wheel with one safe gap per turn. A fast wheel guards a shelf above the start; its valve buys three seconds.

* **Mechanics:** fire_wheel, timed_switch, moving_platform
* **Par time:** 130s
* **Secret `guarded_shelf`** (type timing, difficulty 3, reward `relic_4_7`)
  * Why: A wheel-keeper guarded the relic with a fast flame wheel that only its own valve could quench — briefly.
  * Clue: A chest glints on a shelf behind a spinning wheel right above the start, and a valve switch sits a few steps away ticking when pressed.
  * Discovery: Turn the valve, then hop onto the ledge and up to the shelf before the wheel reignites three seconds later.

### 4-8 Fire Dragon

Boss. The dragon cannot be reached in the air. When it floods the arena with lava, Arin must climb the stepped ledges to the two cooling valves; opening both drenches the dragon and grounds it, exposing its head. The second flood resets the valves and the dragon fights harder.

* **Mechanics:** boss, valve, rising_lava, platforming
* **Par time:** 240s
* **Secret `crumbling_stair`** (type timing, difficulty 2, reward `heart_vessel_4`)
  * Why: The dragon’s keepers reached their store of heart vessels by a stair that was meant to collapse behind them.
  * Clue: Cracked stone steps climb the antechamber wall toward a chest on a high shelf; they tremble and fall a moment after being touched.
  * Discovery: Climb the crumbling steps without pausing and leap to the shelf before they give way.
* **Boss:** THE FIRE DRAGON
  1. `circle` pattern `fly_across`, ends after 7s — “The dragon circles above.”
  2. `rain` pattern `hover`, ends after 8s — “Fire rains from above!”
  3. `flood1` pattern `lava_rise`, ends after all of valve_a, valve_b — “The arena floods with lava — find the cooling valves!”
  4. `down1` pattern `grounded`, weak point exposed, ends after 2 hit(s) — “The dragon has fallen — strike now!”
  5. `flood2` pattern `cooling`, ends after all of valve_a, valve_b — “Open both valves!”
  6. `down2` pattern `grounded`, weak point exposed, ends after 2 hit(s) — “The dragon has fallen — strike now!”

## World 5 — Ice Mountains

### 5-1 Snow Approach

Introduces the mountain: ice that keeps Arin sliding toward spikes, icicles that fall when disturbed, thin ice that breaks under foot, and an ice block that glides across ice onto a plate. Beneath the pond an underwater passage hides the relic.

* **Mechanics:** ice, icicle, thin_ice, ice_block, swim
* **Par time:** 150s
* **Secret `under_the_pond`** (type water, difficulty 2, reward `relic_5_1`)
  * Why: Mountain herders cached a relic in a cave that is only reachable once the pond’s ice cover is broken.
  * Clue: Bubbles rise along the pond’s far wall, and through the thin ice a dark opening is visible below the ground line.
  * Discovery: Let the thin ice break, dive to the bottom and swim left through the opening into the cave.

### 5-2 Ice Slides

Sliding-block puzzles on ice: slide a block against a cliff to climb it, park a stone as a stopper so an ice block halts on the second plate, and light a brazier to melt the ice sealing a doorway. A patch of thin ice on the corridor floor drops into a hidden cave.

* **Mechanics:** ice, ice_block, stone_block, pressure_plate, brazier, thin_ice
* **Par time:** 170s
* **Secret `thin_floor`** (type environmental, difficulty 1, reward `crystal_cave`)
  * Why: Ice miners roofed their storage cave with a thin sheet of ice that a careless step would break.
  * Clue: Three floor tiles of the corridor are paler and crazed with cracks, and the ladder top beside them leads nowhere.
  * Discovery: Walk (don’t jump) over the pale patch so it breaks and drops into the cave; climb the ladder back up.

### 5-3 Frozen Lake

Cross a frozen lake whose ice sheets crack underfoot and whose water chills Arin the longer he swims; floes offer safe rests. On the far bank a dam drains the lake, opening a sealed cave in the lakebed wall where the Temple Key lies. A second lever raises a pond to float up to the exit cliff.

* **Mechanics:** thin_ice, cold_water, float_platform, water_level, lever
* **Par time:** 170s
* **Secret `lakebed_cave`** (type water, difficulty 2, reward `temple_key_5`)
  * Why: The old dam keepers stored the Temple Key in a cave that is only dry — and only unsealed — when the lake is drained.
  * Clue: Under the ice, a carved seal is visible in the lake’s west wall, and the dam lever on the far bank bears the same glyph.
  * Discovery: Turn the dam lever to drain the lake, climb down the ladder and walk back across the lakebed to the opened seal.

### 5-4 Wind Cavern

Wind as a force: gusts shove Arin back mid-jump (cross pits between them), a roaring updraft lifts him up a shaft lined with spikes and cross-gusts, and a fan wakes when Arin steps onto a sail and blows it across a chasm. A cracked patch at the top of the updraft hides a niche.

* **Mechanics:** wind, updraft, wind_platform
* **Par time:** 150s
* **Secret `updraft_niche`** (type false_wall, difficulty 2, reward `crystal_gust`)
  * Why: The cave hermits hid their stores where only someone riding the updraft could reach them.
  * Clue: At the very top of the updraft, where Arin hovers, one patch of the shaft wall is bare of frost and cracked.
  * Discovery: Hover at the top of the updraft, hold toward the cracked wall and strike it.

### 5-5 Falling Ice

Icicles drop a moment after Arin passes beneath. A gallery teaches to keep moving, enemies can be lured under icicles to be crushed, and a lever drops a great icicle down a chimney to shatter the ice pillar sealing a tunnel. A lone icicle above an odd patch of floor is the key to the relic.

* **Mechanics:** icicle, enemies, lever, ice_block
* **Par time:** 140s
* **Secret `icicle_hammer`** (type environmental, difficulty 2, reward `relic_5_5`)
  * Why: The ice cutters sealed their relic cellar with a plug of clear ice, knowing the icicle above would one day break it.
  * Clue: One floor tile is a block of clear ice with a glint beneath it, directly under a lone, heavy icicle.
  * Discovery: Step under the lone icicle to shake it loose, dodge aside and let it shatter the ice plug; drop down the ladder.

### 5-6 Ice Lifts

A vertical climb where every lift is ice: slippery pingpong lifts, a counter-moving pair, a lever-called lift and finally an updraft to the summit. The Temple Door at the base holds the legendary chest; a quick ice lift flicks up to a hidden alcove.

* **Mechanics:** moving_platform, ice, lever, updraft, temple_door
* **Par time:** 150s
* **Secret `flick_alcove`** (type timing, difficulty 3, reward `crystal_alcove`)
  * Why: Ice-cutters used a fast service lift to reach a supply alcove; it pauses at the top only for a heartbeat.
  * Clue: Beside the lever lift a small ice lift shoots up and down, and a glint shines from a notch in the right wall at the top of its run.
  * Discovery: Board the quick lift and step right into the notch in the brief pause at the top — mind the slippery ice.

### 5-7 Blizzard Path

A blizzard sweeps the ridge in waves: moving into the wind is slow and jumping during a gust is hopeless, but rocks give shelter on their lee side. Advance from rock to rock and cross pits in the calm. A herders’ hut opens only when its three braziers burn at once — two stand exposed to the storm.

* **Mechanics:** wind, shelter, brazier, timing, enemies
* **Par time:** 160s
* **Secret `herders_hut`** (type timing, difficulty 3, reward `relic_5_7`)
  * Why: Herders sealed their hut with a fire-lock: the door only yields when all three hearth braziers burn together.
  * Clue: Three cold braziers stand before a hut; one is sheltered by a rock, the other two are scoured by every gust and the hut door bears three flame marks.
  * Discovery: Light the sheltered brazier, then light the two exposed ones in the same lull between gusts.

### 5-8 Ice Dragon

Boss. The dragon hovers over one of two peaks, raining frost breath. A great icicle hangs above each perch; switches on the ledges shake them loose. A direct hit grounds the dragon for a moment — strike its head. It changes perch, then brings a blizzard.

* **Mechanics:** boss, icicle, switch, platforming
* **Par time:** 240s
* **Secret `frozen_niche`** (type false_wall, difficulty 1, reward `heart_vessel_5`)
  * Why: The dragon’s keepers left a heart vessel for any challenger worthy of the fight, walled in with brittle ice.
  * Clue: At the far end of the antechamber one wall section is clear, cracked ice instead of packed snow-rock.
  * Discovery: Walk to the dead end left of the entrance and strike the cracked ice.
* **Boss:** THE ICE DRAGON
  1. `perch_a` pattern `breath`, stunned by `great_icicle_a`, ends after 1 hit(s) — “The great icicle hangs above its perch...”
  2. `perch_b` pattern `swap`, stunned by `great_icicle_b`, ends after 1 hit(s) — “It moves to the other peak!”
  3. `storm` pattern `blizzard`, stunned by `great_icicle_a`, ends after 2 hit(s) — “The blizzard rises!”

## World 6 — Sky Temple

### 6-1 Floating Islands

Introduces the sky: there is no floor below. Hop between floating islands, onto cloud ledges, ride a ferry and cross clouds that dissolve underfoot while celestial spirits swoop. A service platform gliding under one island leads into a cave in its belly.

* **Mechanics:** platforming, moving_platform, crumbling_block, enemies
* **Par time:** 130s
* **Secret `island_belly`** (type environmental, difficulty 2, reward `relic_6_1`)
  * Why: Sky monks stored relics inside the islands themselves, reached by a small cloud platform gliding under the rock.
  * Clue: A small cloud platform drifts back and forth beneath the island for no apparent reason, and a glint flickers from a hole in the island’s underside.
  * Discovery: Drop from the island edge onto the drifting platform, ride it under the island and jump up through the hole.

### 6-2 Cloud Passage

Cloud bridges fade in and out in alternating rhythms: wait on a resting cloud, then cross while the next one is solid. Dissolving clouds must be crossed without stopping, and an updraft lifts Arin to a higher island. A three-step cloud stair appears only briefly — climb it in one go to reach a hidden shrine.

* **Mechanics:** phase_bridge, crumbling_block, updraft, timing
* **Par time:** 140s
* **Secret `fleeting_stair`** (type timing, difficulty 3, reward `crystal_shrine`)
  * Why: The sky monks built a shrine reachable only by a cloud stair that condenses for a few breaths at a time.
  * Clue: Above the small island a faint shimmer outlines three cloud steps climbing toward a shrine on a high rock; every few seconds they solidify together.
  * Discovery: Wait on the small island until the steps appear, then climb all three before they fade.

### 6-3 Wind Platforms

Sail platforms move only while a fan blows on them: each fan wakes when Arin steps aboard its sail — one carries him across, an upward fan lifts a sail like an elevator, and a gusting fan pushes the last sail up a slope in bursts (it drifts back in the lulls). Three constellation switches, pressed in the order carved on a vault beneath the island, release the Temple Key.

* **Mechanics:** wind_platform, wind, sequence
* **Par time:** 160s
* **Secret `star_vault`** (type chain, difficulty 3, reward `temple_key_6`)
  * Why: The sky priests locked the Temple Key under the fan island behind a constellation lock only initiates could read.
  * Clue: Below the island, beside a sealed door reached from a stray cloud, the constellations sun, bird and eye are carved in that order — the same symbols as the three switches above.
  * Discovery: Read the carving under the island, climb back via the up-draught sail and press sun, bird, eye.

### 6-4 Sky Guardians

A combat test of everything Arin has learned: temple knights block the way with ward gates that open only once all their guardians are defeated; flying guardians fire orbs across a ferry crossing; a mixed squad holds the second ward. A cloud beneath the last island leads to a cracked rock.

* **Mechanics:** enemies, ward_gate, moving_platform
* **Par time:** 150s
* **Secret `cracked_rock`** (type false_wall, difficulty 2, reward `crystal_rock`)
  * Why: Guardian novices hid their offerings in a hollow rock hanging beneath the final island.
  * Clue: A lone cloud floats beneath the last island next to a small hanging rock whose face is cracked.
  * Discovery: Drop from the cloud steps down to the lone cloud and strike the cracked rock face.

### 6-5 Light Beams

Sunlight pours down through the sky temple. Turn a mirror to send a sunbeam across a gap into a receiver (a bridge forms), flip a floating mirror with a lever to drop a beam onto the next receiver, and strike a mirror so the sun lights a relay crystal that drives a lift. Following the relay crystal’s own beam leads to a hidden island.

* **Mechanics:** light, mirror, light_receiver, crystal_node, lever
* **Par time:** 150s
* **Secret `relay_isle`** (type chain, difficulty 2, reward `relic_6_5`)
  * Why: The sun priests hid a relic on an island that only the relay crystal’s light can reach.
  * Clue: Once lit, the relay crystal throws its own beam out over the clouds toward a far receiver below the high island.
  * Discovery: Light the relay, then instead of riding the lift, follow its beam: the receiver forms a bridge to the hidden island.

### 6-6 Rotating Rings

Celestial rings carry pairs of platforms. Each ring switch turns its ring a quarter turn: lay the first ring flat to cross, stand the second upright to climb it like a stair, and ride the third across in the few seconds its timed switch holds it flat. The Temple Door on the last island guards the legendary chest.

* **Mechanics:** rotating_platform, switch, timed_switch, temple_door
* **Par time:** 150s
* **Secret `star_rock`** (type false_wall, difficulty 1, reward `crystal_rock`)
  * Why: The ring keepers kept their star charts in a hollow rock at the very edge of the temple island.
  * Clue: Past the temple, across its roof, a rock at the island’s edge has a crack shaped like a ring.
  * Discovery: Climb over the temple roof, drop down beside the rock and strike its cracked face.

### 6-7 Celestial Path

The road to the Sky Deity retraces the whole journey: push a stone onto a plate (jungle), bend sunlight into a receiver (desert), race a crystal bridge (crystal), pass a wave of fire vents (volcano), ride an updraft (ice) and cross clouds between gusts (sky). An echo stone’s melody opens a hut holding the last relic.

* **Mechanics:** stone_block, mirror, crystal_node, fire_jet, updraft, wind, echo_stone
* **Par time:** 180s
* **Secret `echo_hut`** (type chain, difficulty 2, reward `relic_6_7`)
  * Why: The last pilgrims’ hut answers only to the song of the sky: the echo stone beside it remembers it.
  * Clue: An echo stone and three chime crystals stand before a hut whose door bears three notes; striking the stone plays a melody on the chimes.
  * Discovery: Strike the echo stone, listen, then strike the chimes in the same order.

### 6-8 Sky Deity

Final boss in six phases. Survive the opening storm; awaken four pylons on the cloud ledges; turn a floor mirror so sunlight breaks the deity’s shield; flip the celestial ring mirrors to aim a second beam at its seal; then the Heart Seal descends — strike it while the deity unleashes everything.

* **Mechanics:** boss, crystal_node, mirror, lever, light
* **Par time:** 300s
* **Secret `pilgrim_rock`** (type false_wall, difficulty 1, reward `heart_vessel_6`)
  * Why: The last pilgrims left a heart vessel in a hollow rock at the threshold of the Deity’s court.
  * Clue: On the landing before the court, a small rock beside the start has a cracked, sunlit face.
  * Discovery: Turn back from the court and strike the cracked rock.
* **Boss:** THE SKY DEITY
  1. `barrage` pattern `barrage`, ends after 12s — “Survive the celestial storm.”
  2. `pylons` pattern `orbs`, ends after all of pylon_1, pylon_2, pylon_3, pylon_4 — “Awaken the four temple pylons.”
  3. `beams` pattern `sweep`, ends after signal rx_shield — “Turn the light against the shield.”
  4. `rings` pattern `rings`, ends after signal rx_seal — “Rotate the celestial rings to aim the light at the seal.”
  5. `expose` pattern `expose`, ends after 3s — “The seal is exposed!”
  6. `final` pattern `desperate`, weak point exposed, ends after 3 hit(s) — “Strike the Heart Seal!”

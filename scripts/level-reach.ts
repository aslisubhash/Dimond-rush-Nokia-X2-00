// Dev tool: print the validator reachability map of a level. Usage: npx tsx scripts/level-reach.ts 3-2
import { buildGrid, reachable } from '../src/core/levels/validator';
import { compileLevel } from '../src/core/levels/LevelLoader';
import { LEVELS } from '../src/data/levels';
const id = process.argv[2];
const spec = LEVELS.find((l) => l.id === id)!;
const c = compileLevel(spec);
const g = buildGrid(c, c.entities, false);
const r = reachable(g, Math.floor(c.spawn.x / 32), Math.floor((c.spawn.y - 1) / 32));
for (let y = 0; y < c.rows; y++) {
  let s = '';
  for (let x = 0; x < c.cols; x++) s += r[y * c.cols + x] ? 'o' : g.solid[y * c.cols + x] ? '#' : g.support[y * c.cols + x] ? '=' : ' ';
  console.log(String(y).padStart(2) + ' ' + s);
}

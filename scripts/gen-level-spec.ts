/**
 * npm run docs:levels — regenerates LEVEL_SPEC.md from the level data so the spec never drifts.
 */
import { writeFileSync } from 'node:fs';
import { compileLevel } from '../src/core/levels/LevelLoader';
import { EN } from '../src/data/i18n/en';
import { LEVELS } from '../src/data/levels';

const WORLD_NAMES: Record<string, string> = {
  jungle: 'World 1 — Jungle Ruins',
  desert: 'World 2 — Desert Temple',
  crystal: 'World 3 — Crystal Caverns',
  volcano: 'World 4 — Volcano Depths',
  ice: 'World 5 — Ice Mountains',
  sky: 'World 6 — Sky Temple',
};

const out: string[] = [];
out.push('# Level Specification — Relics of the Six Temples (Season 2)');
out.push('');
out.push('> Generated from `src/data/levels` by `npm run docs:levels`. Do not edit by hand.');
out.push('');
out.push('Every level follows START → INTRODUCTION → MECHANIC → COMBINATION → CHALLENGE → SECRET → CHECKPOINT → FINAL PUZZLE → EXIT, and passes `npm run validate-levels` (spawn, exit, reachability, dependencies, secret metadata, boss logic).');
out.push('');
out.push('| Level | Name | Size (tiles) | Crystals | Checkpoints | Enemies | Mechanics | Unique pickups |');
out.push('|---|---|---|---|---|---|---|---|');
for (const l of LEVELS) {
  const c = compileLevel(l);
  const count = (t: string): number => c.entities.filter((e) => e.type === t).length;
  const uniques = c.entities.filter((e) => ['relic', 'temple_key', 'heart_vessel', 'seal'].includes(e.type)).map((e) => e.type.replace('_', ' '));
  const legendary = c.entities.some((e) => e.type === 'chest' && e.props['variant'] === 'legendary') ? ['legendary chest'] : [];
  out.push(`| ${l.id} | ${l.name}${l.boss ? ' (boss)' : ''} | ${c.cols}×${c.rows} | ${count('crystal')} | ${count('checkpoint')} | ${count('enemy')} | ${l.mechanics.join(', ')} | ${[...uniques, ...legendary].join(', ') || '—'} |`);
}
out.push('');
let world = '';
for (const l of LEVELS) {
  if (l.world !== world) {
    world = l.world;
    out.push(`## ${WORLD_NAMES[world] ?? world}`);
    out.push('');
  }
  out.push(`### ${l.id} ${l.name}`);
  out.push('');
  out.push(l.purpose);
  out.push('');
  out.push(`* **Mechanics:** ${l.mechanics.join(', ')}`);
  out.push(`* **Par time:** ${l.parTime}s`);
  for (const s of l.secrets) {
    out.push(`* **Secret \`${s.id}\`** (type ${s.type}, difficulty ${s.difficulty}, reward \`${s.reward}\`)`);
    out.push(`  * Why: ${s.why}`);
    out.push(`  * Clue: ${s.clue}`);
    out.push(`  * Discovery: ${s.discoveryMethod}`);
  }
  if (l.boss) {
    out.push(`* **Boss:** ${EN[l.boss.nameKey as keyof typeof EN] ?? l.boss.kind}`);
    l.boss.phases.forEach((p, i) => {
      const until = 'hits' in p.until ? `${p.until.hits} hit(s)` : 'time' in p.until ? `${p.until.time}s` : 'signal' in p.until ? `signal ${p.until.signal}` : `all of ${p.until.allSignals.join(', ')}`;
      const text = p.textKey ? ` — “${EN[p.textKey as keyof typeof EN] ?? p.textKey}”` : '';
      out.push(`  ${i + 1}. \`${p.id}\` pattern \`${p.pattern}\`${p.stunOn ? `, stunned by \`${p.stunOn}\`` : ''}${p.exposed ? ', weak point exposed' : ''}, ends after ${until}${text}`);
    });
  }
  out.push('');
}
writeFileSync('LEVEL_SPEC.md', out.join('\n'));
console.log(`LEVEL_SPEC.md written (${LEVELS.length} levels).`);

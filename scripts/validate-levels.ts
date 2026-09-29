/**
 * npm run validate-levels
 * Validates every level: spawn/exit, dependencies, doors, secrets, boss logic, bounds,
 * cycles, text keys and theoretical reachability. Exits with code 1 on any error.
 */
import { validateAll, type ValidationIssue } from '../src/core/levels/validator';
import { EN } from '../src/data/i18n/en';
import { LEVELS } from '../src/data/levels';

const issues: ValidationIssue[] = validateAll(LEVELS);

// Text keys referenced by level data must exist.
for (const l of LEVELS) {
  const keys = [...(l.hints ?? []).map((h) => h.textKey), ...(l.introKey ? [l.introKey] : []), ...(l.boss ? [l.boss.nameKey, ...l.boss.phases.flatMap((p) => (p.textKey ? [p.textKey] : []))] : [])];
  for (const k of keys) if (!(k in EN)) issues.push({ level: l.id, severity: 'error', message: `missing text key '${k}'` });
  for (const t of l.triggers ?? []) for (const a of t.actions) if (a.type === 'SHOW_TEXT' && typeof a.value === 'string' && !(a.value in EN)) issues.push({ level: l.id, severity: 'error', message: `missing text key '${a.value}'` });
}

const red = (s: string): string => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string): string => `\x1b[33m${s}\x1b[0m`;
const green = (s: string): string => `\x1b[32m${s}\x1b[0m`;

const byLevel = new Map<string, ValidationIssue[]>();
for (const i of issues) byLevel.set(i.level, [...(byLevel.get(i.level) ?? []), i]);
for (const l of LEVELS) {
  const list = byLevel.get(l.id) ?? [];
  const errs = list.filter((i) => i.severity === 'error').length;
  const warns = list.length - errs;
  const status = errs ? red('FAIL') : warns ? yellow('WARN') : green(' OK ');
  console.log(`[${status}] ${l.id.padEnd(4)} ${l.name}`);
  for (const i of list) console.log(`        ${i.severity === 'error' ? red('error') : yellow('warn ')}  ${i.message}`);
}
for (const [lvl, list] of byLevel) {
  if (LEVELS.some((l) => l.id === lvl)) continue;
  for (const i of list) console.log(`[${i.severity === 'error' ? red('FAIL') : yellow('WARN')}] ${lvl}: ${i.message}`);
}
const errors = issues.filter((i) => i.severity === 'error').length;
const warnings = issues.length - errors;
console.log(`\n${LEVELS.length} levels validated — ${errors ? red(`${errors} error(s)`) : green('0 errors')}, ${warnings} warning(s).`);
process.exit(errors ? 1 : 0);

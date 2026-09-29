import type { LevelSpec } from '../../core/levels/schema';
import { WORLD1 } from './world1';
import { WORLD2 } from './world2';

/** All levels in play order. */
export const LEVELS: readonly LevelSpec[] = [...WORLD1, ...WORLD2];

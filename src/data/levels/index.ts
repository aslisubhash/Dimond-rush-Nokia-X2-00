import type { LevelSpec } from '../../core/levels/schema';
import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD3 } from './world3';
import { WORLD4 } from './world4';
import { WORLD5 } from './world5';

/** All levels in play order. */
export const LEVELS: readonly LevelSpec[] = [...WORLD1, ...WORLD2, ...WORLD3, ...WORLD4, ...WORLD5];

import type { WorldId } from '../types';

export type EnemyBehavior = 'walker' | 'flyer' | 'shooter';

export interface EnemyKind {
  behavior: EnemyBehavior;
  hp: number;
  w: number;
  h: number;
  speed: number;
  chaseSpeed: number;
  chaseRange: number;
  attackRange: number;
  stompable: boolean;
  /** Projectile fired by shooters / flyers. */
  projectile?: { kind: string; speed: number; gravity: number; cooldown: number; aimed: boolean };
  /** Walkers lunge when close. */
  lunge?: number;
  /** Flyers hang from ceilings until the player comes close. */
  hangs?: boolean;
  /** Moves on low-friction ice slides. */
  slides?: boolean;
}

export const ENEMY_KINDS: Record<string, EnemyKind> = {
  // Jungle
  snake: { behavior: 'walker', hp: 1, w: 34, h: 18, speed: 55, chaseSpeed: 120, chaseRange: 200, attackRange: 70, stompable: true, lunge: 320 },
  beetle: { behavior: 'walker', hp: 2, w: 30, h: 22, speed: 45, chaseSpeed: 85, chaseRange: 160, attackRange: 0, stompable: true },
  guardian: { behavior: 'shooter', hp: 3, w: 30, h: 44, speed: 0, chaseSpeed: 0, chaseRange: 420, attackRange: 420, stompable: false, projectile: { kind: 'seed', speed: 260, gravity: 0, cooldown: 2.2, aimed: false } },
  // Desert
  scarab: { behavior: 'walker', hp: 1, w: 26, h: 18, speed: 80, chaseSpeed: 150, chaseRange: 220, attackRange: 0, stompable: true },
  mummy: { behavior: 'walker', hp: 3, w: 24, h: 46, speed: 35, chaseSpeed: 70, chaseRange: 260, attackRange: 40, stompable: false, lunge: 180 },
  sand_warrior: { behavior: 'shooter', hp: 2, w: 26, h: 46, speed: 40, chaseSpeed: 0, chaseRange: 380, attackRange: 380, stompable: false, projectile: { kind: 'spear', speed: 340, gravity: 0, cooldown: 2.4, aimed: false } },
  // Crystal
  crystal_creature: { behavior: 'walker', hp: 2, w: 28, h: 26, speed: 50, chaseSpeed: 110, chaseRange: 200, attackRange: 60, stompable: true, lunge: 260 },
  cave_bat: { behavior: 'flyer', hp: 1, w: 26, h: 18, speed: 90, chaseSpeed: 170, chaseRange: 230, attackRange: 0, stompable: true, hangs: true },
  golem: { behavior: 'walker', hp: 4, w: 40, h: 50, speed: 30, chaseSpeed: 55, chaseRange: 220, attackRange: 50, stompable: false, lunge: 150 },
  // Volcano
  fire_creature: { behavior: 'walker', hp: 2, w: 26, h: 26, speed: 60, chaseSpeed: 130, chaseRange: 220, attackRange: 0, stompable: false },
  lava_beast: { behavior: 'shooter', hp: 3, w: 36, h: 34, speed: 0, chaseSpeed: 0, chaseRange: 460, attackRange: 460, stompable: false, projectile: { kind: 'fireball', speed: 330, gravity: 700, cooldown: 2.6, aimed: true } },
  fire_bat: { behavior: 'flyer', hp: 1, w: 26, h: 18, speed: 100, chaseSpeed: 190, chaseRange: 240, attackRange: 0, stompable: true, hangs: true },
  // Ice
  ice_creature: { behavior: 'walker', hp: 2, w: 28, h: 26, speed: 55, chaseSpeed: 120, chaseRange: 220, attackRange: 0, stompable: true, slides: true },
  frost_bat: { behavior: 'flyer', hp: 1, w: 26, h: 18, speed: 95, chaseSpeed: 180, chaseRange: 240, attackRange: 0, stompable: true, hangs: true },
  snow_guardian: { behavior: 'shooter', hp: 3, w: 32, h: 46, speed: 30, chaseSpeed: 0, chaseRange: 400, attackRange: 400, stompable: false, projectile: { kind: 'snowball', speed: 300, gravity: 600, cooldown: 2.3, aimed: true } },
  // Sky
  celestial: { behavior: 'flyer', hp: 1, w: 24, h: 24, speed: 70, chaseSpeed: 150, chaseRange: 220, attackRange: 0, stompable: true },
  flying_guardian: { behavior: 'flyer', hp: 2, w: 32, h: 28, speed: 70, chaseSpeed: 120, chaseRange: 300, attackRange: 300, stompable: true, projectile: { kind: 'orb', speed: 220, gravity: 0, cooldown: 2.8, aimed: true } },
  temple_knight: { behavior: 'walker', hp: 3, w: 28, h: 48, speed: 45, chaseSpeed: 95, chaseRange: 240, attackRange: 56, stompable: false, lunge: 280 },
};

/** Default enemies for the generic map marks e / f / g. */
export const WORLD_ENEMIES: Record<WorldId, { walker: string; flyer: string; shooter: string }> = {
  jungle: { walker: 'snake', flyer: 'beetle', shooter: 'guardian' },
  desert: { walker: 'scarab', flyer: 'mummy', shooter: 'sand_warrior' },
  crystal: { walker: 'crystal_creature', flyer: 'cave_bat', shooter: 'golem' },
  volcano: { walker: 'fire_creature', flyer: 'fire_bat', shooter: 'lava_beast' },
  ice: { walker: 'ice_creature', flyer: 'frost_bat', shooter: 'snow_guardian' },
  sky: { walker: 'temple_knight', flyer: 'celestial', shooter: 'flying_guardian' },
};

export function resolveEnemyKind(kind: string, world: WorldId): string {
  const map = WORLD_ENEMIES[world];
  if (kind === 'walker') return map.walker;
  if (kind === 'flyer') return map.flyer;
  if (kind === 'shooter') return map.shooter;
  return kind;
}

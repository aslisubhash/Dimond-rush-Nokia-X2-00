import type Phaser from 'phaser';
import type { Entity } from '../../core/entities/Entity';
import type { WorldId } from '../../core/types';
import type { GameWorld } from '../../core/world/GameWorld';
import type { ParticleFX } from '../fx/Particles';
import type { Lighting } from '../fx/Lighting';

export interface RenderContext {
  scene: Phaser.Scene;
  world: GameWorld;
  worldId: WorldId;
  particles: ParticleFX;
  lighting: Lighting;
  highContrast: boolean;
  reducedMotion: boolean;
  /** Shared graphics layer for mechanism lines (chains, magnet fields…), cleared every frame. */
  mech: Phaser.GameObjects.Graphics;
}

/** Visual representation of one simulation entity. */
export abstract class View<E extends Entity = Entity> {
  constructor(
    protected readonly r: RenderContext,
    protected readonly e: E,
  ) {}
  abstract sync(time: number, dt: number): void;
  abstract destroy(): void;
  /** Contribute light spots to darkness levels. */
  light(): void {}
}

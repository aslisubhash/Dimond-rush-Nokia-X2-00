import type { LevelSpec } from './levels/schema';
import type { SaveData } from './save/schema';
import type { WorldId } from './types';

/** Level unlock rules: every level unlocks when the previous one is completed. Perfection is never required. */
export class Progression {
  readonly order: string[];
  private readonly byId: Map<string, LevelSpec>;

  constructor(levels: readonly LevelSpec[]) {
    this.order = levels.map((l) => l.id);
    this.byId = new Map(levels.map((l) => [l.id, l]));
  }

  get(id: string): LevelSpec | undefined {
    return this.byId.get(id);
  }

  isUnlocked(id: string, save: SaveData): boolean {
    const i = this.order.indexOf(id);
    if (i <= 0) return i === 0;
    const prev = this.order[i - 1] as string;
    return !!save.levels[prev]?.completed || !!save.levels[id]?.completed;
  }

  next(id: string): string | null {
    const i = this.order.indexOf(id);
    return i >= 0 && i + 1 < this.order.length ? (this.order[i + 1] as string) : null;
  }

  levelsOf(world: WorldId): LevelSpec[] {
    return this.order.map((id) => this.byId.get(id) as LevelSpec).filter((l) => l.world === world);
  }

  worldUnlocked(world: WorldId, save: SaveData): boolean {
    const first = this.levelsOf(world)[0];
    return !!first && this.isUnlocked(first.id, save);
  }

  /** Crystal completion rating 0..5 stars. */
  static stars(crystals: number, total: number): number {
    if (total <= 0) return 5;
    return Math.round((crystals / total) * 5);
  }

  /** Furthest unlocked level (for "Continue"). */
  frontier(save: SaveData): string {
    let last = this.order[0] as string;
    for (const id of this.order) if (this.isUnlocked(id, save)) last = id;
    return last;
  }
}

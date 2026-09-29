import Phaser from 'phaser';
import { TILE } from '../core/constants';
import { Tile } from '../core/levels/legend';
import type { TileMap } from '../core/physics/TileMap';
import type { WorldId } from '../core/types';
import { hash2, hashString } from '../core/util/math';
import type { GameWorld } from '../core/world/GameWorld';
import { DECO } from './art/decoArt';
import { TI } from './art/tilesArt';
import { DEPTH } from './layers';

const SOLIDISH = new Set<number>([Tile.Solid, Tile.Secret, Tile.Ice, Tile.Sand]);

/** Builds the terrain and back-wall tilemaps and places deterministic decorations. */
export class TerrainRenderer {
  private tilemap: Phaser.Tilemaps.Tilemap;
  private terrain: Phaser.Tilemaps.TilemapLayer;
  private back: Phaser.Tilemaps.TilemapLayer;
  private revision = -1;
  private readonly seed: number;
  readonly lights: { x: number; y: number; r: number; color: number }[] = [];
  private deco: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private scene: Phaser.Scene,
    private world: GameWorld,
    private worldId: WorldId,
  ) {
    const map = world.map;
    this.seed = hashString(world.level.spec.id);
    this.tilemap = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: map.cols, height: map.rows });
    const ts = this.tilemap.addTilesetImage(`tiles_${worldId}`, `tiles_${worldId}`, TILE, TILE, 0, 0) as Phaser.Tilemaps.Tileset;
    this.back = this.tilemap.createBlankLayer('back', ts) as Phaser.Tilemaps.TilemapLayer;
    this.terrain = this.tilemap.createBlankLayer('terrain', ts) as Phaser.Tilemaps.TilemapLayer;
    this.back.setDepth(DEPTH.GAMEPLAY_BACKGROUND);
    this.terrain.setDepth(DEPTH.COLLISION);
    this.buildBack();
    this.refresh();
    this.placeDecorations();
  }

  private solidish(tx: number, ty: number): boolean {
    const m = this.world.map;
    if (tx < 0 || tx >= m.cols || ty >= m.rows) return true;
    if (ty < 0) return false;
    return SOLIDISH.has(m.get(tx, ty));
  }

  private indexFor(map: TileMap, x: number, y: number): number {
    const t = map.get(x, y);
    const above = y > 0 ? map.get(x, y - 1) : Tile.Empty;
    switch (t) {
      case Tile.Solid:
      case Tile.Secret: {
        let mask = 0;
        if (!this.solidish(x, y - 1)) mask |= 1;
        if (!this.solidish(x + 1, y)) mask |= 2;
        if (!this.solidish(x, y + 1)) mask |= 4;
        if (!this.solidish(x - 1, y)) mask |= 8;
        if (t === Tile.Secret) return TI.secret + mask;
        return (hash2(x, y, this.seed) > 0.5 ? TI.terrainA : TI.terrainB) + mask;
      }
      case Tile.OneWay: {
        const l = map.get(x - 1, y) === Tile.OneWay;
        const r = map.get(x + 1, y) === Tile.OneWay;
        return !l && r ? TI.oneWayL : l && !r ? TI.oneWayR : TI.oneWay;
      }
      case Tile.Ladder:
        return TI.ladder;
      case Tile.Vine:
        return TI.vine;
      case Tile.Spikes:
        return TI.spikes;
      case Tile.Ice:
        return SOLIDISH.has(above) ? TI.ice : TI.iceTop;
      case Tile.Sand:
        return SOLIDISH.has(above) ? TI.sand : TI.sandTop;
      case Tile.Quicksand:
        return above === Tile.Quicksand ? TI.quick : TI.quickTop;
      default:
        return -1;
    }
  }

  /** Rebuild terrain tiles when the collision map changed (secret opened …). */
  refresh(): void {
    const map = this.world.map;
    if (map.revision === this.revision) return;
    this.revision = map.revision;
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const idx = this.indexFor(map, x, y);
        if (idx < 0) this.terrain.removeTileAt(x, y);
        else this.terrain.putTileAt(idx, x, y);
      }
    }
  }

  private buildBack(): void {
    const map = this.world.map;
    const spec = this.world.level.spec;
    const open = spec.backdrop?.openSkyRows ?? (this.worldId === 'sky' ? map.rows : 0);
    for (let x = 0; x < map.cols; x++) {
      const edge = open + Math.floor(hash2(x >> 1, 7, this.seed) * 2.5);
      for (let y = 0; y < map.rows; y++) {
        if (y < edge) continue;
        if (SOLIDISH.has(map.get(x, y))) continue;
        let idx = TI.back + Math.floor(hash2(x, y, this.seed + 3) * 4);
        if (y === edge && open > 0) idx = TI.backEdge + (x % 2);
        else if (this.solidish(x, y - 1) || this.solidish(x - 1, y) || this.solidish(x + 1, y)) idx = TI.backDark + ((x + y) % 2);
        this.back.putTileAt(idx, x, y);
      }
    }
  }

  private placeDecorations(): void {
    const map = this.world.map;
    const w = this.worldId;
    const occupied = new Set<number>();
    for (const e of this.world.entities) {
      if (e.type === 'secret_zone' || e.type === 'hint' || e.type === 'trigger_zone' || e.type === 'water_body' || e.type === 'lava_body' || e.type === 'wind_source' || e.type === 'timer' || e.type === 'sequence_lock') continue;
      for (let ty = Math.floor(e.y / TILE) - 1; ty <= Math.floor((e.y + e.h - 1) / TILE); ty++) for (let tx = Math.floor(e.x / TILE); tx <= Math.floor((e.x + e.w - 1) / TILE); tx++) occupied.add(ty * map.cols + tx);
    }
    const s = this.seed;
    const indoor = (this.world.level.spec.backdrop?.openSkyRows ?? 0) === 0 && w !== 'sky';
    for (let y = 1; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const t = map.get(x, y);
        const above = map.get(x, y - 1);
        const free = !occupied.has((y - 1) * map.cols + x);
        if (SOLIDISH.has(t) && t !== Tile.Secret && above === Tile.Empty && free) {
          const r = hash2(x, y, s + 11);
          const px = x * TILE + TILE / 2;
          const py = y * TILE;
          if (r < 0.34) this.img(`deco_${w}_${DECO.tuft}`, px, py + 3, DEPTH.TERRAIN_DECO, 1, 1);
          else if (r < 0.42 && map.get(x, y - 2) === Tile.Empty) this.img(`deco_${w}_${DECO.plant}`, px, py + 2, DEPTH.BACK_DECO, 0.5, 1);
          else if (r < 0.52) this.img(`deco_${w}_${DECO.small}`, px + (hash2(x, y, 3) - 0.5) * 16, py + 1, DEPTH.TERRAIN_DECO, 0.5, 1);
          else if (r < 0.545 && map.get(x, y - 2) === Tile.Empty && map.get(x, y - 3) === Tile.Empty && map.get(x + 1, y - 1) === Tile.Empty && SOLIDISH.has(map.get(x + 1, y))) {
            this.img(`deco_${w}_${DECO.big}`, px + 16, py + 2, DEPTH.BACK_DECO, 0.5, 1, 0.85);
          }
        }
        // Hanging decorations under ceilings.
        if (SOLIDISH.has(above) && t === Tile.Empty && y > 1 && hash2(x, y, s + 13) < 0.12 && free) {
          const img = this.img(`deco_${w}_${DECO.hang}`, x * TILE + 8 + hash2(x, 1, s) * 16, y * TILE - 2, DEPTH.BACK_DECO, 0.5, 0);
          img.setScale(1, 0.4 + hash2(x, y, 5) * 0.6);
        }
        // Wall ornaments and auto torches on back walls.
        if (t === Tile.Empty && this.back.getTileAt(x, y) && free) {
          const r = hash2(x, y, s + 17);
          const floorBelow = SOLIDISH.has(map.get(x, y + 2)) && map.get(x, y + 1) === Tile.Empty;
          if (indoor && floorBelow && x % 11 === Math.floor(s % 11) && r < 0.7) {
            this.img('torch', x * TILE + 16, y * TILE + 16, DEPTH.BACK_DECO, 0.5, 0.5).setFrame(0);
            const flame = this.scene.add.sprite(x * TILE + 16, y * TILE + 4, 'flame', 0).setDepth(DEPTH.BACK_DECO + 1);
            flame.play({ key: 'flame_anim', startFrame: (x + y) % 4 });
            this.deco.push(flame);
            this.lights.push({ x: x * TILE + 16, y: y * TILE + 6, r: 150, color: 0xffb35a });
          } else if (r < 0.008) this.img(`deco_${w}_${DECO.wall}`, x * TILE + 16, y * TILE + 16, DEPTH.BACK_DECO, 0.5, 0.5, 0.8);
        }
      }
    }
  }

  private img(key: string, x: number, y: number, depth: number, ox: number, oy: number, alpha = 1): Phaser.GameObjects.Image {
    const i = this.scene.add.image(x, y, key).setOrigin(ox, oy).setDepth(depth).setAlpha(alpha);
    this.deco.push(i);
    return i;
  }

  destroy(): void {
    for (const d of this.deco) d.destroy();
    this.tilemap.destroy();
  }
}

import { TILE } from '../constants';
import { TILE_PROPS, Tile, type TileProps } from '../levels/legend';

/** Collision grid. Out-of-bounds columns are solid walls; above/below the map is open. */
export class TileMap {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: Uint8Array;
  /** Incremented whenever tiles change so renderers can refresh. */
  revision = 0;

  constructor(cols: number, rows: number, tiles: Uint8Array) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = new Uint8Array(tiles);
  }

  get(tx: number, ty: number): Tile {
    if (tx < 0 || tx >= this.cols) return Tile.Solid;
    if (ty < 0 || ty >= this.rows) return Tile.Empty;
    return this.tiles[ty * this.cols + tx] as Tile;
  }

  set(tx: number, ty: number, t: Tile): void {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return;
    this.tiles[ty * this.cols + tx] = t;
    this.revision++;
  }

  props(tx: number, ty: number): TileProps {
    return TILE_PROPS[this.get(tx, ty)] ?? (TILE_PROPS[Tile.Empty] as TileProps);
  }

  isSolid(tx: number, ty: number): boolean {
    return this.props(tx, ty).solid;
  }

  isSolidAt(px: number, py: number): boolean {
    return this.isSolid(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  tileAt(px: number, py: number): Tile {
    return this.get(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  /** Reveal a connected region of secret tiles starting at (tx,ty). Returns cells opened. */
  openSecret(tx: number, ty: number): { x: number; y: number }[] {
    const opened: { x: number; y: number }[] = [];
    if (this.get(tx, ty) !== Tile.Secret) return opened;
    const stack: [number, number][] = [[tx, ty]];
    while (stack.length) {
      const [x, y] = stack.pop() as [number, number];
      if (this.get(x, y) !== Tile.Secret) continue;
      this.tiles[y * this.cols + x] = Tile.Empty;
      opened.push({ x, y });
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    if (opened.length) this.revision++;
    return opened;
  }
}

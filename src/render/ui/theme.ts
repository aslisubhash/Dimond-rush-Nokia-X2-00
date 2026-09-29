import type Phaser from 'phaser';

export const FONT_TITLE = 'Cinzel, Georgia, serif';
export const FONT_UI = 'Nunito, "Trebuchet MS", sans-serif';

export const COLORS = {
  gold: '#ffd56a',
  goldDark: '#c9971f',
  text: '#f4ecd8',
  dim: '#9a9486',
  purple: '#c77dff',
  teal: '#7cf2c9',
  red: '#ff6a6a',
  panel: 0x0c1018,
  panelEdge: 0xc9971f,
} as const;

export function style(size: number, color: string = COLORS.text, title = false): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: title ? FONT_TITLE : FONT_UI,
    fontSize: `${size}px`,
    color,
    fontStyle: title ? '700' : '700',
    stroke: '#0a0806',
    strokeThickness: Math.max(2, Math.round(size / 8)),
  };
}

/** Apply a vertical gold gradient to a text object (storyboard "SEASON 2" look). */
export function goldText(t: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  const g = t.context.createLinearGradient(0, 0, 0, t.height);
  g.addColorStop(0, '#fff6c8');
  g.addColorStop(0.45, '#ffd56a');
  g.addColorStop(0.55, '#e0a82e');
  g.addColorStop(1, '#8a5a12');
  t.setFill(g);
  return t;
}

/** Gold-trimmed dark panel. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.9): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.panel, alpha).fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(3, COLORS.panelEdge, 1).strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 9);
  g.lineStyle(1, 0xffe28a, 0.35).strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 6);
  g.fillStyle(0xffd56a, 1);
  for (const [cx, cy] of [
    [x + 6, y + 6],
    [x + w - 6, y + 6],
    [x + 6, y + h - 6],
    [x + w - 6, y + h - 6],
  ] as const) g.fillRect(cx - 3, cy - 3, 6, 6);
  return g;
}

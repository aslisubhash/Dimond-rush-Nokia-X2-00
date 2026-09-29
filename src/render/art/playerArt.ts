import { makeCanvas, outline, Px } from './Px';

/** Frame size in display pixels (art grid 24×28 at scale 2). */
export const ARIN_FW = 48;
export const ARIN_FH = 56;

export interface Outfit {
  id: string;
  hat: string;
  hatDark: string;
  band: string;
  shirt: string;
  shirtDark: string;
  vest: string;
  pants: string;
  pantsDark: string;
  scarf: string;
}

export const OUTFITS: Record<string, Outfit> = {
  classic: { id: 'classic', hat: '#d2a866', hatDark: '#9c7438', band: '#5a3a1e', shirt: '#3b73d6', shirtDark: '#264f9a', vest: '#c29a5e', pants: '#6b5236', pantsDark: '#48361f', scarf: '#d8452e' },
  verdant: { id: 'verdant', hat: '#8fb35a', hatDark: '#5c7a33', band: '#2f4a1c', shirt: '#e8e0c0', shirtDark: '#b8ae8a', vest: '#4f7a2e', pants: '#4a5a33', pantsDark: '#303b20', scarf: '#b65cff' },
  sun: { id: 'sun', hat: '#f2d07a', hatDark: '#c49a3a', band: '#8a3a1a', shirt: '#f6f0e0', shirtDark: '#cfc3a4', vest: '#d0802e', pants: '#8a6a3a', pantsDark: '#5e4624', scarf: '#2fb3d6' },
  crystal: { id: 'crystal', hat: '#7a6ad8', hatDark: '#4d3fa0', band: '#e0a8ff', shirt: '#2a2f55', shirtDark: '#1b1e3a', vest: '#8a93d6', pants: '#3a3f78', pantsDark: '#24285a', scarf: '#4dc3ff' },
  flame: { id: 'flame', hat: '#3a2a26', hatDark: '#241715', band: '#ff7a1f', shirt: '#b8321a', shirtDark: '#801f10', vest: '#4a2e1a', pants: '#3a2626', pantsDark: '#241515', scarf: '#ffd35a' },
  frost: { id: 'frost', hat: '#e8f4ff', hatDark: '#a9c8e6', band: '#3f6592', shirt: '#5fa0d8', shirtDark: '#3a73a8', vest: '#ffffff', pants: '#4a77a8', pantsDark: '#2f5580', scarf: '#7fe0ff' },
  celestial: { id: 'celestial', hat: '#ffd56a', hatDark: '#c9971f', band: '#ffffff', shirt: '#ffffff', shirtDark: '#d8d0bc', vest: '#e0b040', pants: '#8fb6e0', pantsDark: '#5f86b3', scarf: '#b65cff' },
};

const SKIN = '#f3c794';
const SKIN_D = '#cf9562';
const HAIR = '#6b3f1f';
const BOOT = '#4a2e1a';
const BELT = '#3a2413';
const EYE = '#1d1410';
const OUTLINE = '#1a1210';

interface Pose {
  bob: number; // body vertical offset
  lean: number; // torso horizontal offset
  hipY: number;
  footF: [number, number];
  footB: [number, number];
  handF: [number, number];
  handB: [number, number];
  crouch?: boolean;
  headDX?: number;
  headDY?: number;
  hatOff?: boolean;
  eyesClosed?: boolean;
  back?: boolean; // climbing, seen from behind
}

function limb(px: Px, x0: number, y0: number, x1: number, y1: number, c: string, c2?: string): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    px.r(x, y, 2, 1, i > steps * 0.55 && c2 ? c2 : c);
  }
}

function drawArin(px: Px, o: Outfit, pose: Pose): void {
  const by = pose.bob;
  const lx = pose.lean;
  const hipY = pose.hipY + by;
  const shoulderY = hipY - (pose.crouch ? 5 : 6);
  const headTop = shoulderY - 6 + (pose.headDY ?? 0);
  const hx = 9 + lx + (pose.headDX ?? 0);

  // Back limbs first (darker).
  limb(px, 10 + lx, hipY, pose.footB[0], pose.footB[1] - 1, o.pantsDark);
  px.r(pose.footB[0] - 1, pose.footB[1] - 1, 3, 1, BOOT);
  limb(px, 9 + lx, shoulderY + 1, pose.handB[0], pose.handB[1], o.shirtDark, SKIN_D);

  // Satchel.
  px.r(8 + lx, hipY - 3, 3, 3, '#7a5530');
  px.p(8 + lx, hipY - 3, '#9a7040');

  // Torso.
  px.r(9 + lx, shoulderY, 6, hipY - shoulderY, o.shirt);
  px.r(9 + lx, shoulderY, 1, hipY - shoulderY, o.shirtDark);
  px.r(10 + lx, shoulderY + 1, 1, hipY - shoulderY - 1, o.vest);
  px.r(13 + lx, shoulderY + 1, 2, hipY - shoulderY - 1, o.vest);
  px.r(9 + lx, hipY - 1, 6, 1, BELT);
  px.p(12 + lx, hipY - 1, '#d6b25a');
  // Strap across chest.
  for (let i = 0; i < hipY - shoulderY - 1; i++) px.p(14 + lx - Math.floor(i * 0.8), shoulderY + i, '#5a3a1e');
  // Scarf.
  px.r(10 + lx, shoulderY - 1, 5, 1, o.scarf);
  px.p(9 + lx, shoulderY, o.scarf);

  // Front leg.
  limb(px, 13 + lx, hipY, pose.footF[0], pose.footF[1] - 1, o.pants);
  px.r(pose.footF[0], pose.footF[1] - 1, 3, 1, BOOT);
  px.p(pose.footF[0] + 2, pose.footF[1] - 1, '#6a4428');

  // Head.
  if (pose.back) {
    px.r(hx + 1, headTop + 1, 5, 5, HAIR);
    px.r(hx + 1, headTop + 5, 5, 1, SKIN_D);
  } else {
    px.r(hx + 1, headTop + 1, 5, 5, SKIN);
    px.r(hx + 1, headTop + 1, 2, 3, HAIR);
    px.p(hx + 1, headTop + 4, HAIR);
    px.p(hx + 6, headTop + 3, SKIN); // nose
    px.p(hx + 4, headTop + 3, pose.eyesClosed ? SKIN_D : EYE);
    px.p(hx + 4, headTop + 2, '#3a2413');
    px.p(hx + 5, headTop + 5, SKIN_D);
  }
  // Hat (fedora).
  if (!pose.hatOff) {
    px.r(hx - 1, headTop + 1, 9, 1, o.hatDark);
    px.r(hx + 1, headTop - 2, 5, 3, o.hat);
    px.r(hx + 1, headTop, 5, 1, o.band);
    px.p(hx + 3, headTop - 2, o.hatDark);
    px.r(hx, headTop + 1, 8, 1, o.hat);
    px.p(hx + 1, headTop - 2, shadeLite(o.hat));
  }

  // Front arm.
  limb(px, 14 + lx, shoulderY + 1, pose.handF[0], pose.handF[1], o.shirt, SKIN);
}

function shadeLite(c: string): string {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number): number => Math.min(255, v + 40);
  return `#${((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
}

const G = 27; // ground row

function runPose(k: number): Pose {
  const a = (k / 6) * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return {
    bob: Math.abs(s) > 0.8 ? -1 : 0,
    lean: 1,
    hipY: 17,
    footF: [11 + Math.round(s * 5), G - Math.max(0, Math.round(c * 3))],
    footB: [11 - Math.round(s * 5), G - Math.max(0, Math.round(-c * 3))],
    handF: [14 - Math.round(s * 4), 16 + Math.round(Math.abs(s))],
    handB: [10 + Math.round(s * 4), 16],
  };
}

export const ARIN_FRAMES: Record<string, Pose> = {
  idle0: { bob: 0, lean: 0, hipY: 17, footF: [13, G], footB: [8, G], handF: [15, 17], handB: [8, 17] },
  idle1: { bob: 1, lean: 0, hipY: 17, footF: [13, G], footB: [8, G], handF: [15, 18], handB: [8, 18] },
  run0: runPose(0),
  run1: runPose(1),
  run2: runPose(2),
  run3: runPose(3),
  run4: runPose(4),
  run5: runPose(5),
  jump: { bob: -1, lean: 0, hipY: 17, footF: [14, 23], footB: [9, 25], handF: [17, 9], handB: [7, 11] },
  fall: { bob: 0, lean: 0, hipY: 17, footF: [15, G], footB: [8, 25], handF: [18, 12], handB: [6, 12] },
  land: { bob: 2, lean: 0, hipY: 17, footF: [14, G], footB: [8, G], handF: [16, 19], handB: [7, 19] },
  crouch: { bob: 0, lean: 1, hipY: 22, crouch: true, footF: [15, G], footB: [9, G], handF: [17, 21], handB: [8, 22] },
  crawl0: { bob: 0, lean: 1, hipY: 22, crouch: true, footF: [16, G], footB: [8, G], handF: [18, 22], handB: [9, 22] },
  crawl1: { bob: 0, lean: 1, hipY: 22, crouch: true, footF: [13, G], footB: [10, G], handF: [16, 22], handB: [11, 22] },
  climb0: { bob: 0, lean: 0, hipY: 17, back: true, footF: [13, 25], footB: [9, G], handF: [15, 6], handB: [8, 10] },
  climb1: { bob: 0, lean: 0, hipY: 17, back: true, footF: [13, G], footB: [9, 25], handF: [15, 10], handB: [8, 6] },
  swim0: { bob: 2, lean: 1, hipY: 17, footF: [16, 25], footB: [7, 26], handF: [20, 11], handB: [6, 14] },
  swim1: { bob: 2, lean: 1, hipY: 17, footF: [14, 26], footB: [9, 24], handF: [16, 14], handB: [10, 11] },
  push0: { bob: 1, lean: 3, hipY: 18, footF: [14, G], footB: [7, G], handF: [21, 13], handB: [20, 15] },
  push1: { bob: 1, lean: 3, hipY: 18, footF: [16, G], footB: [9, G], handF: [21, 14], handB: [20, 16] },
  pull0: { bob: 1, lean: -2, hipY: 18, footF: [12, G], footB: [5, G], handF: [20, 15], handB: [19, 16] },
  pull1: { bob: 1, lean: -2, hipY: 18, footF: [10, G], footB: [7, G], handF: [20, 15], handB: [19, 16] },
  hurt: { bob: 0, lean: -2, hipY: 17, footF: [13, G], footB: [6, 25], handF: [16, 9], handB: [4, 12], headDX: -1, eyesClosed: true },
  attack0: { bob: 0, lean: -1, hipY: 17, footF: [14, G], footB: [7, G], handF: [8, 8], handB: [7, 15] },
  attack1: { bob: 0, lean: 1, hipY: 17, footF: [15, G], footB: [7, G], handF: [21, 12], handB: [8, 17] },
  attack2: { bob: 0, lean: 1, hipY: 17, footF: [15, G], footB: [8, G], handF: [20, 15], handB: [8, 17] },
  death0: { bob: 3, lean: -1, hipY: 17, footF: [14, G], footB: [8, G], handF: [16, 12], handB: [5, 12], eyesClosed: true },
  death1: { bob: 7, lean: -2, hipY: 17, crouch: true, footF: [17, G], footB: [5, G], handF: [19, 26], handB: [3, 26], eyesClosed: true, hatOff: true },
  victory: { bob: -1, lean: 0, hipY: 17, footF: [14, G], footB: [8, G], handF: [16, 3], handB: [7, 17] },
};

export const ARIN_FRAME_NAMES = Object.keys(ARIN_FRAMES);

/** Render all frames of an outfit into one horizontal strip. */
export function renderArin(outfitId: string): { canvas: HTMLCanvasElement; frames: string[] } {
  const o = OUTFITS[outfitId] ?? (OUTFITS['classic'] as Outfit);
  const names = ARIN_FRAME_NAMES;
  const canvas = makeCanvas(ARIN_FW * names.length, ARIN_FH);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  names.forEach((n, i) => {
    const frame = makeCanvas(ARIN_FW, ARIN_FH);
    const px = new Px(frame.getContext('2d') as CanvasRenderingContext2D, 2);
    drawArin(px, o, ARIN_FRAMES[n] as Pose);
    outline(frame, OUTLINE, 2);
    ctx.drawImage(frame, i * ARIN_FW, 0);
  });
  return { canvas, frames: names };
}

/** Portrait for the HUD (head and hat, 3× art scale). */
export function renderPortrait(outfitId: string): HTMLCanvasElement {
  const o = OUTFITS[outfitId] ?? (OUTFITS['classic'] as Outfit);
  const c = makeCanvas(60, 60);
  const px = new Px(c.getContext('2d') as CanvasRenderingContext2D, 3);
  px.r(3, 8, 14, 12, SKIN);
  px.r(3, 8, 5, 7, HAIR);
  px.r(3, 15, 2, 3, HAIR);
  px.r(11, 11, 2, 2, EYE);
  px.r(11, 10, 3, 1, '#3a2413');
  px.r(15, 12, 2, 2, SKIN_D);
  px.r(9, 17, 5, 1, '#b8664a');
  px.r(0, 6, 20, 2, o.hatDark);
  px.r(3, 1, 14, 5, o.hat);
  px.r(3, 4, 14, 2, o.band);
  px.r(5, 1, 3, 1, shadeLite(o.hat));
  px.r(2, 18, 16, 2, o.scarf);
  outline(c, OUTLINE, 3);
  return c;
}

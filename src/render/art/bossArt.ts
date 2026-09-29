import { shade } from './palette';
import type { Px } from './Px';
import { canvasArt, sheet, type ArtAsset } from './sheet';

const OL = '#140d0b';

function serpentHead(px: Px, open: boolean): void {
  // Faces right. Art 56×40.
  const a = '#3f8a3a';
  const b = '#1f4a1f';
  const c = '#8ad04a';
  px.ellipse(22, 18, 16, 11, a);
  px.ellipse(20, 14, 12, 6, c);
  for (let x = 10; x < 34; x += 5) for (let y = 10; y < 26; y += 5) px.p(x + ((y / 5) % 2) * 2, y, b);
  // Snout / jaws.
  px.r(32, open ? 10 : 13, 18, 7, a).h(32, open ? 10 : 13, 18, c);
  px.r(32, open ? 24 : 20, 16, 6, shade(a, -0.1)).h(32, open ? 29 : 25, 16, b);
  if (open) {
    px.r(33, 17, 16, 7, '#6a1a2a').r(34, 18, 13, 5, '#a82a3a');
    for (let x = 34; x < 48; x += 3) px.v(x, 17, 2, '#fffbe0').v(x + 1, 22, 2, '#fffbe0');
    px.line(46, 21, 54, 23, '#ff3a5a').line(54, 23, 55, 21, '#ff3a5a').line(54, 23, 55, 25, '#ff3a5a');
  }
  // Eye & brow.
  px.ellipse(30, 11, 3, 2, '#ffd35a').v(30, 10, 3, '#1a1210');
  px.line(26, 7, 34, 8, b);
  // Hood fins.
  px.line(10, 6, 4, 1, a).line(12, 5, 8, 0, a).line(8, 28, 2, 34, a);
  // Forehead gem (weak point).
  px.disc(22, 9, 3, '#b65cff').p(21, 8, '#fbe6ff');
}

function serpentSeg(px: Px): void {
  px.disc(12, 12, 11, '#3f8a3a');
  px.disc(12, 14, 8, '#e8d070');
  px.disc(11, 10, 6, '#5fa84a');
  for (let k = 0; k < 6; k++) px.p(6 + k * 2, 6 + (k % 2), '#1f4a1f');
}

function kingThrone(px: Px): void {
  // Art 100×110. Throne back, seated body.
  const gold = '#e0b040';
  const goldD = '#9a7420';
  const stone = '#a8773a';
  px.r(10, 10, 80, 100, stone).v(10, 10, 100, '#d9aa5c').v(89, 10, 100, '#6b4520');
  px.r(6, 4, 88, 8, gold).h(6, 4, 88, '#fff2a8').h(6, 11, 88, goldD);
  for (let x = 14; x < 88; x += 12) px.r(x, 16, 6, 8, '#6b4520');
  px.r(0, 60, 16, 50, stone).r(84, 60, 16, 50, stone).h(0, 60, 16, gold).h(84, 60, 16, gold);
  // Seated body.
  px.r(30, 40, 40, 36, '#2f5ab3').r(32, 42, 36, 4, gold).r(46, 46, 8, 30, gold);
  px.r(26, 76, 48, 20, '#e8dcc0').h(26, 76, 48, gold);
  px.r(30, 96, 14, 12, '#c98a4a').r(56, 96, 14, 12, '#c98a4a');
  // Chest gem socket.
  px.disc(50, 50, 7, goldD).disc(50, 50, 5, '#3a2413');
}

function kingHead(px: Px, slumped: boolean): void {
  // Art 48×48 pharaoh head.
  px.r(8, 4, 32, 30, '#2f5ab3');
  for (let y = 6; y < 34; y += 4) px.h(8, y, 32, '#e0b040');
  px.r(14, 8, 20, 24, '#c98a4a').v(14, 8, 24, '#e8b870');
  px.r(12, 2, 24, 6, '#e0b040').h(12, 2, 24, '#fff2a8');
  px.r(22, 0, 4, 4, '#e0b040').p(23, 0, '#ff5a3a');
  const eye = slumped ? '#ff5a3a' : '#4dd6ff';
  px.r(17, 16, 5, 2, '#1a1210').r(26, 16, 5, 2, '#1a1210').p(19, 16, eye).p(28, 16, eye);
  px.r(22, 22, 4, 2, '#8a5a2a').r(19, 27, 10, 2, '#6b3a1a');
  px.r(21, 32, 6, 10, '#2f5ab3').h(21, 34, 6, '#e0b040').h(21, 38, 6, '#e0b040');
}

function kingArm(px: Px): void {
  px.r(6, 0, 12, 30, '#c98a4a').v(6, 0, 30, '#e8b870').r(5, 6, 14, 3, '#e0b040').r(5, 22, 14, 3, '#e0b040');
  px.ellipse(12, 36, 7, 6, '#c98a4a').line(8, 40, 6, 46, '#a86a2a').line(12, 41, 12, 47, '#a86a2a').line(16, 40, 18, 46, '#a86a2a');
}

function titanBody(px: Px): void {
  const a = '#5a61a8';
  const b = '#2a2f55';
  const c = '#8b93d6';
  px.r(14, 8, 36, 30, a).v(14, 8, 30, c).v(49, 8, 30, b).h(14, 8, 36, c);
  for (let y = 12; y < 38; y += 8) px.h(15, y, 34, b);
  px.r(18, 38, 12, 24, a).r(34, 38, 12, 24, a).v(18, 38, 24, c).r(16, 58, 16, 6, b).r(32, 58, 16, 6, b);
  // Crystal weak points on the back / chest.
  const cr = '#b65cff';
  px.r(22, 14, 4, 8, cr).p(22, 14, '#fbe6ff').r(36, 18, 5, 10, cr).p(36, 18, '#fbe6ff').r(28, 26, 3, 6, '#4dc3ff');
}

function titanHead(px: Px): void {
  px.r(4, 4, 16, 14, '#5a61a8').h(4, 4, 16, '#8b93d6').r(7, 9, 4, 3, '#4dc3ff').r(13, 9, 4, 3, '#4dc3ff').h(8, 15, 8, '#2a2f55');
  px.r(10, 0, 4, 5, '#b65cff');
}

function titanArm(px: Px): void {
  px.r(4, 0, 12, 28, '#5a61a8').v(4, 0, 28, '#8b93d6').h(4, 10, 12, '#2a2f55');
  px.r(2, 28, 16, 14, '#3a3f78').h(2, 28, 16, '#8b93d6').r(5, 31, 4, 5, '#b65cff');
}

function dragonHead(px: Px, open: boolean, ice: boolean): void {
  const a = ice ? '#86b8de' : '#b8321a';
  const b = ice ? '#3a5f8a' : '#5a120a';
  const c = ice ? '#e4f4ff' : '#ff7a3a';
  const eye = ice ? '#ffffff' : '#ffd35a';
  px.ellipse(18, 20, 14, 10, a).ellipse(16, 16, 10, 5, c);
  px.r(26, open ? 12 : 16, 26, 8, a).h(26, open ? 12 : 16, 26, c);
  px.r(26, open ? 26 : 23, 22, 6, shade(a, -0.1)).h(26, open ? 31 : 28, 22, b);
  if (open) {
    px.r(28, 20, 22, 6, ice ? '#dff4ff' : '#ffb31f').r(30, 21, 18, 4, ice ? '#ffffff' : '#fffbe0');
  }
  for (let x = 28; x < 50; x += 4) px.v(x, open ? 19 : 22, 2, '#fffbe0');
  px.ellipse(26, 12, 3, 2, eye).v(26, 11, 3, '#1a1210');
  // Horns.
  px.line(12, 10, 2, 0, b).line(13, 10, 3, 0, c).line(18, 9, 12, 1, b);
  px.p(49, 16, b);
}

function dragonSeg(px: Px, ice: boolean): void {
  const a = ice ? '#86b8de' : '#b8321a';
  const c = ice ? '#e4f4ff' : '#ff7a3a';
  const b = ice ? '#3a5f8a' : '#5a120a';
  px.ellipse(16, 14, 14, 11, a).ellipse(16, 18, 10, 6, c);
  for (let x = 6; x < 28; x += 5) px.line(x, 4, x + 2, 0, b);
}

function dragonWing(px: Px, up: boolean, ice: boolean): void {
  const m = ice ? '#bfe6ff' : '#e04a1a';
  const b = ice ? '#3a5f8a' : '#5a120a';
  const tip = up ? 2 : 40;
  px.line(4, 30, 60, tip, b).line(5, 30, 61, tip, b);
  for (let k = 0; k < 4; k++) {
    const tx = 20 + k * 12;
    const ty = tip + (30 - tip) * (1 - (k + 1) / 5) + 4;
    px.line(4, 30, tx, Math.round(ty) + 14, b);
  }
  for (let y = 0; y < 46; y++) {
    for (let x = 6; x < 60; x++) {
      const edge = tip + ((30 - tip) * (60 - x)) / 56;
      if (y > edge && y < edge + 10 + (x % 12 < 6 ? 6 : 2)) px.p(x, y, m);
    }
  }
}

function deityBody(px: Px): void {
  const g = '#e0b040';
  const gl = '#fff2a8';
  const gd = '#9a7420';
  // Lotus base.
  px.ellipse(56, 118, 50, 8, gd).ellipse(56, 114, 46, 6, g);
  // Crossed legs & torso.
  px.ellipse(56, 104, 36, 10, g).r(38, 60, 36, 40, g).v(38, 60, 40, gl).v(73, 60, 40, gd);
  px.r(44, 64, 24, 3, gd).r(52, 70, 8, 26, gd);
  // Head with crown.
  px.ellipse(56, 44, 13, 15, g).ellipse(53, 40, 8, 9, gl);
  px.r(43, 22, 26, 8, gd).r(46, 14, 4, 10, g).r(54, 10, 4, 14, g).r(62, 14, 4, 10, g).p(55, 10, '#b65cff');
  px.r(49, 42, 5, 2, '#1a1210').r(59, 42, 5, 2, '#1a1210').r(54, 50, 5, 2, gd);
  // Seal socket.
  px.disc(56, 80, 9, gd).disc(56, 80, 7, '#3a2413');
}

function deityArm(px: Px): void {
  px.r(6, 0, 10, 40, '#e0b040').v(6, 0, 40, '#fff2a8').r(4, 12, 14, 3, '#9a7420');
  px.ellipse(11, 46, 7, 6, '#e0b040').disc(11, 45, 2, '#b65cff');
}

export function bossAssets(): ArtAsset[] {
  return [
    sheet('serpent_head', 112, 80, 2, (px, i) => serpentHead(px, i === 1), { outline: OL }),
    sheet('serpent_seg', 48, 48, 1, (px) => serpentSeg(px), { outline: OL }),
    sheet('king_throne', 200, 220, 1, (px) => kingThrone(px), { outline: OL }),
    sheet('king_head', 96, 96, 2, (px, i) => kingHead(px, i === 1), { outline: OL }),
    sheet('king_arm', 48, 96, 1, (px) => kingArm(px), { outline: OL }),
    sheet('titan_body', 128, 128, 1, (px) => titanBody(px), { outline: OL }),
    sheet('titan_head', 48, 40, 1, (px) => titanHead(px), { outline: OL }),
    sheet('titan_arm', 40, 88, 1, (px) => titanArm(px), { outline: OL }),
    sheet('dragon_head_fire', 112, 72, 2, (px, i) => dragonHead(px, i === 1, false), { outline: OL }),
    sheet('dragon_head_ice', 112, 72, 2, (px, i) => dragonHead(px, i === 1, true), { outline: OL }),
    sheet('dragon_seg_fire', 64, 56, 1, (px) => dragonSeg(px, false), { outline: OL }),
    sheet('dragon_seg_ice', 64, 56, 1, (px) => dragonSeg(px, true), { outline: OL }),
    sheet('dragon_wing_fire', 128, 96, 2, (px, i) => dragonWing(px, i === 0, false)),
    sheet('dragon_wing_ice', 128, 96, 2, (px, i) => dragonWing(px, i === 0, true)),
    sheet('deity_body', 224, 256, 1, (px) => deityBody(px), { outline: '#4a3208' }),
    sheet('deity_arm', 40, 112, 1, (px) => deityArm(px), { outline: '#4a3208' }),
    canvasArt('deity_halo', 360, 360, (ctx) => {
      ctx.translate(180, 180);
      for (let r = 170; r > 120; r -= 12) {
        ctx.strokeStyle = r % 24 === 2 ? 'rgba(255,226,138,0.9)' : 'rgba(255,246,207,0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let k = 0; k < 24; k++) {
        ctx.rotate(Math.PI / 12);
        ctx.fillStyle = k % 2 ? '#ffe28a' : '#fff6cf';
        ctx.fillRect(126, -4, 40, 8);
      }
    }),
  ];
}

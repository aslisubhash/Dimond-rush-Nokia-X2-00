import { WORLD_ORDER, type WorldId } from '../../core/types';
import { PALETTES, mix, shade } from './palette';
import type { Px } from './Px';
import { sheet, type ArtAsset } from './sheet';

const OL = '#1a1210';

function gem(px: Px, x: number, y: number, c: [string, string, string, string], shine: number): void {
  // Faceted gem 10×14 art px: highlight, light, mid, dark.
  const [hi, lt, md, dk] = c;
  const rows = ['....hh....', '...hlll...', '..hllmmm..', '.hllmmmmd.', 'hllmmmmmdd', 'llmmmmmddd', 'lmmmmmmddd', 'mmmmmmdddd', '.mmmmdddd.', '..mmmddd..', '...mddd...', '....dd....', '.....d....'];
  px.grid(x, y, rows, { h: hi, l: lt, m: md, d: dk });
  px.v(x + 4, y + 2, 9, lt);
  if (shine >= 0) {
    const sx = x + 1 + shine;
    px.line(sx, y + 9, sx + 3, y + 2, '#ffffff');
  }
}

const PURPLE: [string, string, string, string] = ['#fbe6ff', '#e0a8ff', '#b65cff', '#6f2fb8'];

function stoneBlock(px: Px, world: WorldId, carved: boolean): void {
  const p = PALETTES[world].stone;
  px.r(0, 0, 16, 16, p[2]);
  px.h(0, 0, 16, p[0]).v(0, 0, 16, p[1]).h(0, 15, 16, p[3]).v(15, 0, 16, p[3]);
  px.r(1, 1, 14, 1, p[1]);
  px.r(2, 2, 12, 12, mix(p[2], p[1], 0.3));
  px.h(2, 13, 12, p[3]).v(13, 2, 12, p[3]);
  if (carved) {
    // Spiral glyph.
    px.r(5, 5, 6, 1, p[3]).r(5, 5, 1, 6, p[3]).r(5, 10, 5, 1, p[3]).r(10, 7, 1, 4, p[3]).r(7, 7, 3, 1, p[3]).p(7, 8, p[3]);
  }
}

function faceStone(px: Px, world: WorldId): void {
  const p = PALETTES[world].stone;
  px.disc(8, 8, 7, p[2]);
  px.disc(7, 7, 5, mix(p[2], p[1], 0.5));
  px.disc(6, 6, 2, p[0]);
  // Carved face.
  px.r(4, 6, 2, 2, p[3]).r(10, 6, 2, 2, p[3]).p(4, 5, p[3]).p(11, 5, p[3]);
  px.r(7, 8, 2, 2, p[3]);
  px.r(5, 11, 6, 1, p[3]).p(4, 10, p[3]).p(11, 10, p[3]);
  if (world === 'jungle') px.r(2, 3, 3, 1, '#5da83a').p(3, 2, '#a6dd5a');
}

export function objectAssets(): ArtAsset[] {
  const out: ArtAsset[] = [];
  // Crystal: 6 shimmer frames.
  out.push(sheet('crystal', 24, 30, 6, (px, i) => gem(px, 1, 1, PURPLE, i < 4 ? i * 2 : -1), { outline: '#3a1060' }));
  // Coin: spin.
  out.push(
    sheet('coin', 18, 18, 6, (px, i) => {
      const w = [7, 6, 4, 1, 4, 6][i] as number;
      const cx = 4;
      px.r(cx - Math.floor(w / 2) + 0, 1, Math.max(1, w), 7, '#e0a82e');
      if (w > 2) {
        px.r(cx - Math.floor(w / 2) + 1, 2, w - 2, 5, '#ffd35a');
        px.v(cx, 3, 3, '#b67a1a');
      }
      px.p(cx - Math.floor(w / 2), 2, '#fff2a8');
    }, { outline: '#5a3a0a' }),
  );
  out.push(
    sheet('relic', 30, 30, 1, (px) => {
      px.grid(1, 1, ['..ggggggggg...', '.gttttttttttg.', 'gtwttttttwtttg', 'gtttwwwtttttg.', 'gtttwttwttttg.', 'gttttwwtttttg.', 'gtwttttttttg..', 'gtttttttwttg..', '.gttwwtttttg..', '..gtttttttg...', '...gggggggg...'], {
        g: '#d6a73a',
        t: '#2fb3a0',
        w: '#bff5ea',
      });
    }, { outline: OL }),
  );
  out.push(
    sheet('temple_key', 30, 30, 1, (px) => {
      px.disc(4, 4, 3, '#ffd35a').disc(4, 4, 1, '#b65cff');
      px.r(6, 4, 7, 2, '#e0a82e').r(10, 6, 1, 3, '#e0a82e').r(12, 6, 1, 2, '#e0a82e').h(6, 4, 7, '#fff2a8');
    }, { outline: '#5a3a0a' }),
  );
  out.push(sheet('key', 24, 16, 1, (px) => px.disc(3, 3, 2, '#c9a24a').r(5, 3, 6, 1, '#c9a24a').r(9, 4, 1, 2, '#c9a24a').r(7, 4, 1, 1, '#c9a24a').p(3, 3, '#3a2413'), { outline: '#3a2413' }));
  const heartRows = ['.hh.hh.', 'hlmhmmd', 'hmmmmmd', 'mmmmmmd', '.mmmmd.', '..mmd..', '...d...'];
  out.push(sheet('heart', 20, 18, 1, (px) => px.grid(1, 1, heartRows, { h: '#ffd0d0', l: '#ffffff', m: '#e83a4a', d: '#9a1a2a' }), { outline: OL }));
  out.push(
    sheet('heart_vessel', 30, 30, 1, (px) => {
      px.disc(7, 7, 6, '#e0b040');
      px.disc(7, 7, 5, '#3a2413');
      px.grid(4, 4, heartRows, { h: '#ffd0d0', l: '#ffffff', m: '#e83a4a', d: '#9a1a2a' });
    }, { outline: OL }),
  );
  // Elemental seals.
  const sealCol: Record<WorldId, string> = { jungle: '#5da83a', desert: '#ffd35a', crystal: '#b65cff', volcano: '#ff5a1f', ice: '#7fe0ff', sky: '#ffffff' };
  for (const w of WORLD_ORDER) {
    out.push(
      sheet(`seal_${w}`, 40, 40, 1, (px) => {
        px.disc(10, 10, 9, '#c9971f').disc(10, 10, 8, '#ffd56a').disc(10, 10, 6, shade(sealCol[w], -0.2)).disc(10, 10, 4, sealCol[w]);
        px.p(8, 7, '#ffffff').p(9, 7, '#ffffff');
      }, { outline: '#4a3208' }),
    );
  }
  // Chests (closed/open).
  const chestCols: Record<string, [string, string, string, string]> = {
    normal: ['#a8743a', '#7a4f22', '#e0b040', '#4a2e12'],
    secret: ['#6a4aa8', '#4a2e80', '#e0a8ff', '#24163f'],
    boss: ['#e0b040', '#a87a1a', '#fff2a8', '#5a3a0a'],
    legendary: ['#2fb3a0', '#1a7a6a', '#ffd35a', '#0a3a32'],
  };
  for (const [name, [wood, dark, trim, deep]] of Object.entries(chestCols)) {
    out.push(
      sheet(`chest_${name}`, 32, 32, 2, (px, i) => {
        if (i === 0) {
          px.r(1, 5, 14, 5, wood).h(1, 5, 14, shade(wood, 0.12)).r(1, 10, 14, 5, dark);
          px.r(1, 9, 14, 1, trim).v(1, 5, 10, trim).v(14, 5, 10, trim).r(7, 8, 2, 3, trim).p(7, 9, deep);
          px.r(2, 3, 12, 2, wood).h(2, 3, 12, shade(wood, 0.2));
        } else {
          px.r(1, 10, 14, 5, dark).v(1, 9, 6, trim).v(14, 9, 6, trim).h(1, 9, 14, trim);
          px.r(2, 10, 12, 2, '#fff2a8');
          px.r(2, 2, 12, 3, wood).h(2, 1, 12, trim).r(2, 5, 12, 1, deep);
        }
      }, { outline: OL }),
    );
  }
  for (const w of WORLD_ORDER) {
    out.push(sheet(`stone_block_${w}`, 32, 32, 1, (px) => stoneBlock(px, w, true), { outline: OL }));
    out.push(sheet(`face_stone_${w}`, 32, 32, 1, (px) => faceStone(px, w), { outline: OL }));
  }
  out.push(
    sheet('crate', 32, 32, 1, (px) => {
      px.r(0, 0, 16, 16, '#9a6a3a').h(0, 0, 16, '#c08a4a').r(0, 15, 16, 1, '#5a3a1a');
      for (const y of [4, 8, 12]) px.h(1, y, 14, '#6a4422');
      px.line(1, 1, 14, 14, '#c08a4a').line(1, 2, 13, 14, '#6a4422');
      px.v(0, 0, 16, '#6a4422').v(15, 0, 16, '#6a4422');
    }, { outline: OL }),
  );
  out.push(
    sheet('rolling_stone', 64, 64, 1, (px) => {
      px.disc(16, 16, 15, '#6b6a4c').disc(14, 14, 11, '#8f8c66').disc(11, 11, 5, '#b8b48a');
      px.line(6, 20, 14, 26, '#403f2c').line(20, 6, 26, 14, '#403f2c').line(10, 8, 12, 14, '#403f2c');
    }, { outline: OL }),
  );
  for (const pol of ['N', 'S']) {
    out.push(
      sheet(`magnet_stone_${pol}`, 32, 32, 1, (px) => {
        stoneBlock(px, 'crystal', false);
        const c = pol === 'N' ? '#ff5a5a' : '#4da3ff';
        px.r(4, 4, 8, 8, shade(c, -0.25)).r(5, 5, 6, 6, c);
        if (pol === 'N') px.v(6, 6, 4, '#fff').v(9, 6, 4, '#fff').line(6, 6, 9, 9, '#fff');
        else px.h(6, 6, 4, '#fff').h(6, 8, 4, '#fff').h(6, 10, 4, '#fff').p(6, 7, '#fff').p(9, 9, '#fff');
      }, { outline: OL }),
    );
  }
  out.push(
    sheet('ice_block', 32, 32, 1, (px) => {
      px.r(0, 0, 16, 16, '#9fd6f5').h(0, 0, 16, '#ffffff').v(0, 0, 16, '#dff4ff').h(0, 15, 16, '#5f93c0').v(15, 0, 16, '#5f93c0');
      px.line(3, 3, 7, 10, '#e8f7ff').line(9, 4, 12, 7, '#e8f7ff').r(10, 10, 3, 3, '#c4e6fa');
    }, { outline: '#2a4a70' }),
  );
  out.push(
    sheet('plate', 32, 10, 2, (px, i) => {
      const y = i === 0 ? 0 : 2;
      px.r(1, y, 14, 5 - y, '#8f8c66').h(1, y, 14, '#b8b48a').h(1, 4, 14, '#403f2c');
      px.r(5, y + 1, 6, 1, i ? '#ffd35a' : '#6b6a4c');
    }, { outline: OL }),
  );
  out.push(
    sheet('switch', 32, 32, 2, (px, i) => {
      px.r(3, 4, 10, 10, '#6b6a4c').h(3, 4, 10, '#b8b48a').h(3, 13, 10, '#403f2c');
      px.disc(8, 9, 3, i ? '#ffd35a' : '#8a7a5a');
      px.p(7, 8, i ? '#fffbe0' : '#a89a7a');
    }, { outline: OL }),
  );
  out.push(
    sheet('lever', 32, 32, 2, (px, i) => {
      px.r(4, 12, 8, 4, '#6b6a4c').h(4, 12, 8, '#b8b48a');
      const tx = i ? 12 : 4;
      px.line(8, 12, tx, 4, '#7a5530').line(9, 12, tx + 1, 4, '#5a3a1e');
      px.disc(tx, 3, 2, i ? '#ffd35a' : '#d84a3a');
    }, { outline: OL }),
  );
  for (const glyph of ['ankh', 'eye', 'sun', 'bird']) {
    out.push(
      sheet(`glyph_${glyph}`, 32, 32, 2, (px, i) => {
        px.r(1, 1, 14, 14, '#a8773a').h(1, 1, 14, '#f6d58c').h(1, 14, 14, '#6b4520');
        const c = i ? '#4dd6ff' : '#5a3a14';
        if (glyph === 'ankh') px.disc(8, 5, 2, c).p(8, 5, i ? '#a8773a' : '#a8773a').v(8, 7, 6, c).h(5, 8, 7, c);
        if (glyph === 'eye') px.ellipse(8, 8, 4, 2, c).disc(8, 8, 1, i ? '#ffffff' : '#a8773a').line(6, 10, 5, 13, c);
        if (glyph === 'sun') {
          px.disc(8, 8, 3, c);
          for (let a = 0; a < 8; a++) px.p(8 + Math.round(Math.cos((a * Math.PI) / 4) * 5), 8 + Math.round(Math.sin((a * Math.PI) / 4) * 5), c);
        }
        if (glyph === 'bird') px.line(4, 9, 8, 6, c).line(8, 6, 12, 9, c).p(8, 7, c).r(7, 7, 3, 3, c).p(11, 5, c);
      }, { outline: OL }),
    );
  }
  out.push(
    sheet('torch', 16, 32, 2, (px, i) => {
      px.r(3, 8, 2, 8, '#7a5530').r(2, 7, 4, 2, '#5a3a1e').r(1, 14, 6, 2, '#6b6a4c');
      if (i === 1) px.r(2, 7, 4, 1, '#3a2413');
    }, { outline: OL }),
  );
  out.push(
    sheet('flame', 16, 24, 4, (px, i) => {
      const sway = [0, 1, 0, -1][i] as number;
      px.ellipse(4 + sway, 7, 3, 4, '#ff7a1f');
      px.ellipse(4 + sway, 8, 2, 3, '#ffd35a');
      px.p(4 + sway * 2, 2, '#ff7a1f').p(4, 9, '#fffbe0');
    }),
  );
  out.push(
    sheet('brazier', 32, 32, 2, (px, i) => {
      px.r(3, 9, 10, 3, '#6b6a4c').h(3, 9, 10, '#b8b48a').r(5, 12, 6, 2, '#403f2c').r(4, 14, 8, 2, '#6b6a4c');
      if (i) px.r(4, 8, 8, 1, '#ffb31f');
      else px.r(4, 8, 8, 1, '#3a3a3a');
    }, { outline: OL }),
  );
  const nodeCols: Record<string, [string, string, string, string]> = {
    purple: PURPLE,
    blue: ['#e6fbff', '#9fe6ff', '#4dc3ff', '#1a6aa8'],
    gold: ['#fffbe0', '#ffe28a', '#e0b040', '#8a6a20'],
    red: ['#ffe0d0', '#ff9a6a', '#ff5a1f', '#8a1a0a'],
  };
  for (const [name, col] of Object.entries(nodeCols)) {
    out.push(
      sheet(`crystal_node_${name}`, 32, 64, 2, (px, i) => {
        px.r(3, 26, 10, 6, '#6b6a4c').h(3, 26, 10, '#b8b48a').h(3, 31, 10, '#403f2c');
        const c: [string, string, string, string] = i ? col : [mix(col[0], '#555', 0.5), mix(col[1], '#444', 0.6), mix(col[2], '#333', 0.6), mix(col[3], '#222', 0.6)];
        px.grid(4, 6, ['...hh...', '..hllm..', '..hlmm..', '.hllmmd.', '.hlmmmd.', '.llmmmd.', 'hllmmmdd', 'llmmmmdd', 'llmmmmdd', 'lmmmmddd', 'lmmmmddd', 'mmmmmddd', 'mmmmdddd', 'mmmmdddd', '.mmmddd.', '.mmdddd.', '..mddd..', '..mmdd..', '...md...', '...dd...'], { h: c[0], l: c[1], m: c[2], d: c[3] });
      }, { outline: OL }),
    );
  }
  out.push(
    sheet('echo_stone', 32, 32, 1, (px) => {
      px.ellipse(8, 10, 6, 5, '#5a61a8').ellipse(7, 9, 4, 3, '#8b93d6');
      for (let r = 1; r < 4; r++) px.p(8 + r, 6 - r, '#b8f0ff');
      px.r(3, 14, 10, 2, '#3a3f78');
    }, { outline: OL }),
  );
  for (const w of WORLD_ORDER) {
    const p = PALETTES[w].stone;
    out.push(
      sheet(`door_${w}`, 32, 96, 1, (px) => {
        px.r(0, 0, 16, 48, p[2]).v(0, 0, 48, p[1]).v(15, 0, 48, p[3]);
        for (let y = 6; y < 48; y += 10) px.h(1, y, 14, p[3]).h(1, y + 1, 14, p[1]);
        px.r(5, 16, 6, 10, p[3]).r(6, 17, 4, 8, mix(p[2], PALETTES[w].accent, 0.3)).p(8, 20, PALETTES[w].accent);
      }, { outline: OL }),
    );
    out.push(
      sheet(`locked_door_${w}`, 32, 96, 1, (px) => {
        px.r(0, 0, 16, 48, '#7a5530').v(0, 0, 48, '#a07a4a').v(15, 0, 48, '#4a2e12');
        for (let x = 3; x < 16; x += 4) px.v(x, 0, 48, '#5a3a1e');
        for (const y of [6, 40]) px.r(0, y, 16, 2, '#6b6a4c');
        px.r(5, 20, 6, 8, '#e0b040').r(7, 22, 2, 2, '#1a1210').v(7, 24, 3, '#1a1210');
      }, { outline: OL }),
    );
    out.push(
      sheet(`platform_${w}`, 32, 16, 3, (px, i) => {
        const [a, b, c] = PALETTES[w].platform;
        if (w === 'sky') {
          px.r(0, 1, 16, 5, '#f6e7b8').h(0, 1, 16, '#ffffff').h(0, 6, 16, '#e0b040').h(0, 7, 16, '#9a7420');
        } else {
          px.r(0, 0, 16, 6, b).h(0, 0, 16, a).h(0, 5, 16, c).h(0, 7, 16, shade(c, -0.1));
          px.r(0, 6, 16, 1, c);
          if (w === 'crystal') px.h(0, 2, 16, '#bfe4ff');
          if (w === 'volcano') px.p(5, 3, '#ff7a1f').p(11, 4, '#ff7a1f');
          if (w === 'ice') px.h(0, 0, 16, '#ffffff').p(4, 7, '#dff4ff').p(12, 7, '#dff4ff');
        }
        if (i === 0) px.v(0, 0, 7, c);
        if (i === 2) px.v(15, 0, 7, c);
      }, { outline: OL }),
    );
  }
  out.push(
    sheet('gate_bars', 32, 96, 1, (px) => {
      px.r(0, 0, 16, 3, '#6b6a4c').h(0, 0, 16, '#b8b48a');
      for (let x = 2; x < 16; x += 4) px.v(x, 3, 45, '#8a8a92').v(x + 1, 3, 45, '#4a4a52');
      px.r(0, 20, 16, 2, '#6b6a4c');
    }, { outline: OL }),
  );
  out.push(
    sheet('boss_gate', 32, 128, 1, (px) => {
      px.r(0, 0, 16, 64, '#5a4a3a').v(0, 0, 64, '#8a7a5a').v(15, 0, 64, '#2a2018');
      for (let y = 4; y < 64; y += 8) px.h(2, y, 12, '#e0b040');
      px.disc(8, 32, 5, '#e0b040').disc(8, 32, 3, '#b65cff');
    }, { outline: OL }),
  );
  out.push(
    sheet('temple_door', 32, 96, 1, (px) => {
      px.r(0, 0, 16, 48, '#3a3a5a').v(0, 0, 48, '#6a6a9a').v(15, 0, 48, '#1a1a2a');
      px.disc(8, 20, 5, '#e0b040').disc(8, 20, 3, '#1a1a2a').r(7, 23, 2, 6, '#e0b040');
    }, { outline: OL }),
  );
  out.push(
    sheet('bridge', 32, 16, 1, (px) => {
      px.r(0, 0, 16, 5, '#9fe6ff').h(0, 0, 16, '#ffffff').h(0, 4, 16, '#4dc3ff');
      for (let x = 2; x < 16; x += 5) px.line(x, 1, x + 2, 3, '#e6fbff');
    }),
  );
  out.push(
    sheet('exit_gate', 64, 96, 1, (px) => {
      const s = '#b8a57c';
      const d = '#6b5a3a';
      px.r(0, 6, 5, 42, s).r(27, 6, 5, 42, s).v(4, 6, 42, d).v(27, 6, 42, d);
      px.r(0, 0, 32, 7, s).h(0, 0, 32, '#e8dcc0').h(0, 6, 32, d);
      px.r(12, 1, 8, 5, '#e0b040').disc(16, 3, 2, '#b65cff');
      for (let y = 12; y < 48; y += 8) px.h(0, y, 5, d).h(27, y, 5, d);
      px.r(1, 44, 30, 4, d).h(1, 44, 30, s);
    }, { outline: OL }),
  );
  out.push(
    sheet('checkpoint', 32, 64, 2, (px, i) => {
      px.r(4, 8, 8, 24, '#6b6a4c').v(4, 8, 24, '#8f8c66').v(11, 8, 24, '#403f2c');
      px.r(3, 28, 10, 4, '#403f2c').r(3, 6, 10, 3, '#8f8c66');
      px.r(6, 12, 4, 3, i ? '#7cf2c9' : '#2a3a34').r(6, 18, 4, 4, i ? '#2fb3a0' : '#3a4a44');
      px.p(7, 13, i ? '#ffffff' : '#4a5a54');
    }, { outline: OL }),
  );
  out.push(
    sheet('platform_float', 32, 16, 3, (px, i) => {
      px.r(0, 1, 16, 5, '#3f8a3a').h(0, 1, 16, '#6fc84a').h(0, 5, 16, '#27572a');
      if (i === 0) px.p(0, 1, 'rgba(0,0,0,0)');
      px.p(4 + i * 3, 3, '#a6dd5a');
    }, { outline: OL }),
  );
  out.push(
    sheet('sail', 32, 40, 1, (px) => {
      px.v(8, 0, 20, '#7a5530');
      px.grid(9, 1, ['wwww....', 'wwwwww..', 'wwwwwww.', 'wwwwwwww', 'wwwwwww.', 'wwwwww..', 'wwww....'], { w: '#f6f0e0' });
      px.h(9, 4, 7, '#e0b040');
    }, { outline: OL }),
  );
  out.push(
    sheet('mirror', 32, 32, 2, (px, i) => {
      px.r(6, 13, 4, 3, '#6b5a3a');
      const pts = i === 0 ? [2, 13, 13, 2] : [2, 2, 13, 13];
      const [x0, y0, x1, y1] = pts as [number, number, number, number];
      px.line(x0, y0, x1, y1, '#b8862e');
      px.line(x0 + 1, y0, x1 + 1, y1, '#e8f4ff');
      px.line(x0 + (i ? 0 : 1), y0 + (i ? 1 : 1), x1 + (i ? 0 : 1), y1 + 1, '#9fd6f5');
    }, { outline: OL }),
  );
  out.push(
    sheet('light_source', 32, 32, 1, (px) => {
      px.r(1, 1, 14, 14, '#a8773a').h(1, 1, 14, '#f6d58c');
      px.disc(8, 8, 4, '#ffe28a').disc(8, 8, 2, '#ffffff');
      for (let a = 0; a < 8; a++) px.p(8 + Math.round(Math.cos((a * Math.PI) / 4) * 6), 8 + Math.round(Math.sin((a * Math.PI) / 4) * 6), '#ffd35a');
    }, { outline: OL }),
  );
  out.push(
    sheet('light_receiver', 32, 32, 2, (px, i) => {
      px.disc(8, 8, 7, '#8a6a20').disc(8, 8, 6, i ? '#ffe28a' : '#5a4a2a').disc(8, 8, 3, i ? '#ffffff' : '#3a2e1a');
      px.p(6, 5, i ? '#ffffff' : '#7a6a4a');
    }, { outline: OL }),
  );
  out.push(
    sheet('laser_emitter', 32, 32, 1, (px) => {
      px.r(1, 3, 12, 10, '#3a3f78').h(1, 3, 12, '#8b93d6').r(13, 6, 3, 4, '#5a61a8').r(14, 7, 2, 2, '#ff3a5a');
      px.disc(6, 8, 2, '#b65cff');
    }, { outline: OL }),
  );
  out.push(
    sheet('magnet', 32, 32, 2, (px, i) => {
      const c = i ? '#ff5a5a' : '#4da3ff';
      px.r(1, 2, 14, 12, '#3a3f78').h(1, 2, 14, '#8b93d6');
      px.r(4, 4, 8, 3, c).r(4, 9, 8, 3, c).r(4, 4, 3, 8, c);
      px.r(10, 4, 2, 3, '#e8e8f0').r(10, 9, 2, 3, '#e8e8f0');
    }, { outline: OL }),
  );
  out.push(
    sheet('fan', 32, 32, 2, (px, i) => {
      px.r(1, 1, 14, 14, '#bfae8a').h(1, 1, 14, '#fffaf0').h(1, 14, 14, '#8a7552');
      px.disc(8, 8, 5, '#3a3a4a');
      const a = i ? 0.5 : 0;
      for (let k = 0; k < 3; k++) {
        const ang = a + (k * Math.PI * 2) / 3;
        px.line(8, 8, 8 + Math.round(Math.cos(ang) * 4), 8 + Math.round(Math.sin(ang) * 4), '#d8e8f8');
      }
    }, { outline: OL }),
  );
  out.push(sheet('fire_jet', 32, 16, 1, (px) => px.r(3, 2, 10, 6, '#3f2520').h(3, 2, 10, '#8a5a48').r(6, 0, 4, 2, '#211212').p(7, 0, '#ff7a1f'), { outline: OL }));
  out.push(
    sheet('saw', 48, 48, 2, (px, i) => {
      const n = 10;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + (i ? Math.PI / n : 0);
        px.line(12, 12, 12 + Math.round(Math.cos(a) * 11), 12 + Math.round(Math.sin(a) * 11), '#c8ccd8');
      }
      px.disc(12, 12, 8, '#9aa0b0').disc(12, 12, 6, '#c8ccd8').disc(12, 12, 2, '#4a4a58');
    }, { outline: OL }),
  );
  out.push(
    sheet('icicle', 24, 36, 2, (px, i) => {
      const c = i ? ['#9aa0a0', '#6b6a6a', '#dcd8c8'] : ['#bfe6ff', '#86b8de', '#ffffff'];
      for (let y = 0; y < 16; y++) {
        const w = Math.max(1, 7 - Math.floor(y / 2.4));
        px.h(6 - Math.floor(w / 2), y, w, y % 5 === 0 ? (c[2] as string) : (c[0] as string));
        px.p(6 + Math.floor(w / 2) - 1, y, c[1] as string);
      }
    }, { outline: '#2a4a70' }),
  );
  out.push(sheet('spike_trap', 32, 16, 1, (px) => {
    for (let i = 0; i < 4; i++) for (let y = 0; y < 7; y++) px.h(i * 4 + 2 - Math.floor(Math.max(1, (y + 1) / 2) / 2), y, Math.max(1, Math.floor((y + 1) / 2)), y < 2 ? '#ffffff' : '#a9a38a');
    px.h(0, 7, 16, '#5d5a4a');
  }));
  // Clues.
  out.push(
    sheet('clue_crack', 32, 32, 1, (px) => {
      px.line(8, 1, 6, 6, '#1a1210').line(6, 6, 9, 10, '#1a1210').line(9, 10, 7, 15, '#1a1210').line(6, 6, 3, 8, '#1a1210');
      px.line(9, 1, 7, 6, 'rgba(255,255,255,0.25)');
    }),
  );
  out.push(
    sheet('clue_moss', 32, 16, 1, (px) => {
      for (let x = 1; x < 15; x++) px.v(x, 0, 2 + ((x * 7) % 4), x % 3 ? '#b8f07a' : '#7ad04a');
    }),
  );
  out.push(
    sheet('clue_glyph', 32, 32, 4, (px, i) => {
      const c = '#e0a8ff';
      if (i === 0) px.disc(8, 5, 2, c).v(8, 7, 7, c).h(5, 8, 7, c);
      if (i === 1) px.ellipse(8, 8, 5, 3, c).disc(8, 8, 1, '#1a1210');
      if (i === 2) px.disc(8, 8, 3, c).line(8, 1, 8, 3, c).line(8, 13, 8, 15, c).line(1, 8, 3, 8, c).line(13, 8, 15, 8, c);
      if (i === 3) px.line(3, 10, 8, 6, c).line(8, 6, 13, 10, c).r(7, 6, 3, 3, c);
    }),
  );
  // Projectiles.
  out.push(sheet('proj_seed', 16, 16, 1, (px) => px.disc(4, 4, 2, '#a6dd5a').p(3, 3, '#ffffff'), { outline: OL }));
  out.push(sheet('proj_spear', 32, 8, 1, (px) => px.h(0, 2, 12, '#a07a4a').r(12, 1, 3, 3, '#c8ccd8').p(15, 2, '#ffffff'), { outline: OL }));
  out.push(sheet('proj_venom', 16, 16, 1, (px) => px.disc(4, 4, 3, '#8ad04a').disc(4, 4, 1, '#e8ff9a'), { outline: '#1a3a10' }));
  out.push(sheet('proj_fireball', 24, 24, 2, (px, i) => px.disc(6, 6, 5 - i, '#ff5a1f').disc(6, 6, 3, '#ffb31f').disc(5, 5, 1, '#fffbe0')));
  out.push(sheet('proj_snowball', 16, 16, 1, (px) => px.disc(4, 4, 3, '#ffffff').p(3, 3, '#dff4ff').p(5, 5, '#a9d8f5'), { outline: '#2a4a70' }));
  out.push(sheet('proj_ice', 16, 16, 1, (px) => px.r(2, 3, 5, 2, '#bfe6ff').r(3, 2, 3, 4, '#86b8de').p(3, 3, '#ffffff'), { outline: '#2a4a70' }));
  out.push(sheet('proj_shard', 16, 16, 1, (px) => gem(px, 0, 0, PURPLE, -1)));
  out.push(sheet('proj_orb', 24, 24, 2, (px, i) => px.disc(6, 6, 5, i ? '#ffe28a' : '#fff6cf').disc(6, 6, 3, '#ffffff')));
  out.push(sheet('proj_sand', 24, 24, 1, (px) => px.disc(6, 6, 5, '#d9aa5c').disc(5, 5, 3, '#f6d58c'), { outline: '#6b4520' }));
  out.push(
    sheet('proj_sandwave', 40, 32, 2, (px, i) => {
      for (let x = 0; x < 20; x++) {
        const h = Math.round(6 + Math.sin(x * 0.5 + i) * 3 + (x > 4 && x < 16 ? 4 : 0));
        px.v(x, 16 - h, h, x % 2 ? '#e8c270' : '#d9aa5c');
      }
    }),
  );
  out.push(
    sheet('proj_shockwave', 40, 24, 2, (px, i) => {
      for (let x = 0; x < 20; x++) {
        const h = Math.max(1, Math.round(5 - Math.abs(x - 10) * 0.45 + i));
        px.v(x, 12 - h, h, x % 3 ? '#b65cff' : '#e0a8ff');
      }
    }),
  );
  return out;
}

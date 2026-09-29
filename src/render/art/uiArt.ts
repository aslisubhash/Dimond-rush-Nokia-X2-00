import { sheet, canvasArt, type ArtAsset } from './sheet';

const OL = '#140d0b';

export function uiAssets(): ArtAsset[] {
  const heart = ['.hh.hh.', 'hlmhmmd', 'hmmmmmd', 'mmmmmmd', '.mmmmd.', '..mmd..', '...d...'];
  return [
    sheet('ui_heart', 32, 28, 3, (px, i) => {
      const full = { h: '#ffd0d0', l: '#ffffff', m: '#e83a4a', d: '#9a1a2a' };
      const empty = { h: '#5a4a4a', l: '#6a5a5a', m: '#3a2a2e', d: '#241a1e' };
      px.grid(1, 1, heart, i === 2 ? empty : full);
      if (i === 1) px.grid(1, 1, heart.map((r) => '....' + r.slice(4)), empty);
    }, { outline: OL, scale: 4 }),
    sheet('ui_crystal', 28, 32, 1, (px) => px.grid(1, 1, ['..hh..', '.hllm.', 'hllmmd', 'lmmmmd', 'lmmmdd', '.mmdd.', '..dd..'], { h: '#fbe6ff', l: '#e0a8ff', m: '#b65cff', d: '#6f2fb8' }), { outline: '#3a1060', scale: 4 }),
    sheet('ui_coin', 28, 28, 1, (px) => px.grid(1, 1, ['.yyyy.', 'ywwyyo', 'ywyyyo', 'yyyyyo', 'yyyyoo', '.oooo.'], { y: '#ffd35a', w: '#fff2a8', o: '#b67a1a' }), { outline: '#5a3a0a', scale: 4 }),
    sheet('ui_relic', 28, 28, 1, (px) => px.grid(1, 1, ['gggggg', 'gtwttg', 'gttwtg', 'gtwttg', '.gttg.', '..gg..'], { g: '#d6a73a', t: '#2fb3a0', w: '#bff5ea' }), { outline: OL, scale: 4 }),
    sheet('ui_key', 28, 20, 1, (px) => px.grid(0, 1, ['yy....', 'y.yyyy', 'yy.y.y'], { y: '#e0b040' }), { outline: '#5a3a0a', scale: 4 }),
    canvasArt('ui_panel', 48, 48, (ctx) => {
      ctx.fillStyle = 'rgba(12,16,24,0.88)';
      ctx.fillRect(2, 2, 44, 44);
      ctx.strokeStyle = '#c9971f';
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, 42, 42);
      ctx.strokeStyle = 'rgba(255,226,138,0.35)';
      ctx.strokeRect(7, 7, 34, 34);
      ctx.fillStyle = '#ffd56a';
      for (const [x, y] of [
        [2, 2],
        [42, 2],
        [2, 42],
        [42, 42],
      ] as const) ctx.fillRect(x, y, 4, 4);
    }),
    canvasArt('ui_touch_btn', 128, 128, (ctx) => {
      ctx.fillStyle = 'rgba(20,24,34,0.45)';
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,226,138,0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }),
    canvasArt('ui_node', 48, 48, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(24, 24, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1210';
      ctx.lineWidth = 4;
      ctx.stroke();
    }),
  ];
}

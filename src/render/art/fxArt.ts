import { canvasArt, sheet, type ArtAsset } from './sheet';

function radial(key: string, size: number, stops: [number, string][]): ArtAsset {
  return canvasArt(key, size, size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

export function fxAssets(): ArtAsset[] {
  return [
    radial('glow', 128, [
      [0, 'rgba(255,255,255,1)'],
      [0.25, 'rgba(255,255,255,0.45)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    radial('light', 256, [
      [0, 'rgba(255,255,255,1)'],
      [0.5, 'rgba(255,255,255,0.6)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    radial('soft', 16, [
      [0, 'rgba(255,255,255,1)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    canvasArt('spark', 4, 4, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 4, 4);
    }),
    canvasArt('pixel2', 2, 2, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 2, 2);
    }),
    sheet('leaf', 12, 8, 2, (px, i) => {
      px.r(0, 1, 5, 2, i ? '#8ad04a' : '#5da83a').p(5, 2, '#2f6a22').p(1, 0, '#a6dd5a');
    }),
    sheet('flake', 8, 8, 1, (px) => px.p(1, 0, '#fff').p(0, 1, '#fff').p(2, 1, '#fff').p(1, 2, '#fff').p(1, 1, '#dff4ff')),
    sheet('bubble', 10, 10, 1, (px) => {
      px.p(2, 0, '#bff5ea').p(1, 1, '#bff5ea').p(3, 1, '#bff5ea').p(0, 2, '#bff5ea').p(4, 2, '#bff5ea').p(1, 3, '#bff5ea').p(3, 3, '#bff5ea').p(2, 4, '#bff5ea').p(1, 1, '#ffffff');
    }),
    canvasArt('shaft', 96, 512, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, 'rgba(255,255,230,0.55)');
      g.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(66, 0);
      ctx.lineTo(96, 512);
      ctx.lineTo(0, 512);
      ctx.fill();
    }),
    canvasArt('whip', 48, 12, (ctx) => {
      ctx.strokeStyle = '#6a4428';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(24, -2, 46, 6);
      ctx.stroke();
      ctx.strokeStyle = '#a07a4a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }),
    canvasArt('slash', 64, 48, (ctx) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(8, 40, 40, -1.3, -0.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,160,0.5)';
      ctx.lineWidth = 8;
      ctx.stroke();
    }),
    canvasArt('vignette', 640, 360, (ctx) => {
      const g = ctx.createRadialGradient(320, 180, 120, 320, 180, 380);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 640, 360);
    }),
    canvasArt('caustics', 128, 64, (ctx) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        const y = (i * 23) % 64;
        for (let x = 0; x <= 128; x += 8) ctx.lineTo(x, y + Math.sin((x / 128) * Math.PI * 4 + i) * 6);
        ctx.stroke();
      }
    }),
    canvasArt('waterfall', 32, 64, (ctx) => {
      ctx.fillStyle = 'rgba(120,220,255,0.55)';
      ctx.fillRect(0, 0, 32, 64);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(190,240,255,0.5)';
        const x = (i * 7) % 30;
        ctx.fillRect(x, (i * 13) % 64, 2, 14 + (i % 3) * 6);
      }
    }),
    canvasArt('sandfall', 32, 64, (ctx) => {
      ctx.fillStyle = 'rgba(232,194,112,0.85)';
      ctx.fillRect(2, 0, 28, 64);
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(251,228,164,0.9)' : 'rgba(184,138,69,0.9)';
        ctx.fillRect((i * 5) % 28 + 2, (i * 11) % 64, 2, 6);
      }
    }),
    canvasArt('wind_streak', 64, 4, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 1, 64, 2);
    }),
  ];
}

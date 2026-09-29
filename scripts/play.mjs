// Dev helper: scripted play session. Usage: node scripts/play.mjs <url> <outPrefix> '<json steps>'
// steps: [{"hold":["ArrowRight"],"ms":800},{"press":"Space"},{"shot":"name"},{"eval":"expr"}]
import { chromium } from 'playwright';
const [, , url, prefix, stepsJson] = process.argv;
const steps = JSON.parse(stepsJson);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
for (const s of steps) {
  if (s.hold) {
    for (const k of s.hold) await page.keyboard.down(k);
    await page.waitForTimeout(s.ms ?? 300);
    for (const k of s.hold) await page.keyboard.up(k);
  }
  if (s.press) await page.keyboard.press(s.press, { delay: s.delay ?? 60 });
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.shot) await page.screenshot({ path: `${prefix}_${s.shot}.png` });
  if (s.eval) console.log(s.eval, '=>', JSON.stringify(await page.evaluate(s.eval)));
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();

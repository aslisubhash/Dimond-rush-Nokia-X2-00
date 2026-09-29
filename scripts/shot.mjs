// Dev helper: screenshot a page of the running dev server. Usage: node scripts/shot.mjs <url> <out.png> [w] [h] [waitMs]
import { chromium } from 'playwright';
const [, , url, outPath, w = '1400', h = '900', wait = '800'] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: outPath });
console.log(logs.slice(0, 40).join('\n'));
await browser.close();

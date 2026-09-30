// Builds a single self-contained HTML page (all JS, CSS and fonts inlined) for hosting as
// a claude.ai Artifact or any static single-file host. Usage: node scripts/build-artifact.mjs <out.html>
import { build } from 'vite';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist-artifact/relics-of-the-six-temples.html';
const dir = 'dist-artifact/build';
await build({
  configFile: false,
  base: './',
  logLevel: 'warn',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    outDir: dir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

const assets = join(dir, 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8'));
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8'));
if (js.length !== 1) throw new Error(`expected a single JS bundle, got ${js.length}`);
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const pageStyle = (html.match(/<style>([\s\S]*?)<\/style>/) ?? [])[1] ?? '';
const safeJs = js[0].replace(/<\/script/gi, '<\\/script');

const page = `<title>Relics of the Six Temples</title>
<style>
${pageStyle}
html, body { background: #07060a; }
${css.join('\n')}
</style>
<div id="game"></div>
<div id="rotate">Rotate your device to landscape for the best experience.</div>
<script type="module">
${safeJs}
</script>
`;
writeFileSync(out, page);
console.log(`wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);

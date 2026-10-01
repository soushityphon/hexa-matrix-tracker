import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = ['scouter-request-diagnostic.html', 'index.html', 'app.js', 'matrix-app.js', 'planner.js', 'styles.css', 'data.js', 'skill-colours.js', 'priority-review.html', 'priority-review.css', 'priority-review.js', 'admin-panel-model.js', 'priority-draft.js', 'preview-priorities.js', 'scouter-import.js', 'scouter-extract.js', 'skill-cost-review.js'];
const assets = Object.fromEntries(files.map(file => [`/${file}`, readFileSync(resolve(root, file), 'utf8')]));
for (const file of ['assets/sol-erda.png', 'assets/sol-erda-fragment.png']) {
  assets[`/${file}`] = readFileSync(resolve(root, file)).toString('base64');
}
const output = `const ASSETS = ${JSON.stringify(assets)};\n${readFileSync(resolve(root, 'worker.js'), 'utf8')}`;
const outDir = resolve(root, 'dist/server');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.js'), output);
for (const file of ['data.js', 'priority-draft.js', 'admin-panel-model.js', 'scouter-request-context.js', 'scouter-request-policy.js', 'scouter-discovery.js', 'scouter-catalogue-acquisition.js', 'scouter-order-acquisition.js', 'scouter-review-overlays.js']) copyFileSync(resolve(root, file), resolve(outDir, file));
console.log(`Bundled ${files.length} assets and HEXA route`);

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = ['index.html', 'app.js', 'planner.js', 'styles.css', 'data.js', 'priority-review.html', 'priority-review.css', 'priority-review.js', 'priority-draft.js', 'preview-priorities.js', 'scouter-import.js', 'scouter-extract.js'];
const assets = Object.fromEntries(files.map(file => [`/${file}`, readFileSync(resolve(root, file), 'utf8')]));
const output = `const ASSETS = ${JSON.stringify(assets)};\n${readFileSync(resolve(root, 'worker.js'), 'utf8')}`;
const outDir = resolve(root, 'dist/server');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.js'), output);
console.log(`Bundled ${files.length} assets and HEXA route`);

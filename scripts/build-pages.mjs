import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
execFileSync(process.execPath, [resolve(root, 'scripts/build-worker.mjs')], { stdio: 'inherit' });
const output = resolve(root, 'dist/pages');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
// No app HTML or server modules are static fallback assets. This also prevents
// a Functions quota/failure fallback from exposing an unguarded Admin page.
writeFileSync(resolve(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found</title><p>Not found.</p></html>\n');
writeFileSync(resolve(output, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude: [] }, null, 2) + '\n');
console.log('Pages output prepared; server modules remain in dist/server, outside static output.');

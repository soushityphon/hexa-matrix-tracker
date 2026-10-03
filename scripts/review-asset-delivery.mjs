import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

// Offline inventory of the actual build. No catalogue/API requests or DB reads.
// Compression is a local size comparison, not a measured HTTP transfer or limit.
const root = resolve(import.meta.dirname, '..');
const bundle = readFileSync(resolve(root, 'dist/server/index.js'));
const firstLine = bundle.toString('utf8').split('\n', 1)[0];
assert.match(firstLine, /^const ASSETS = .*;$/);
const assets = JSON.parse(firstLine.slice('const ASSETS = '.length, -1));
const groups = new Map();
const media = [];
for (const [path, value] of Object.entries(assets)) {
  const binary = ['.png', '.ico', '.mp3'].includes(extname(path));
  const original = readFileSync(resolve(root, path.slice(1)));
  const decoded = Buffer.from(value, binary ? 'base64' : 'utf8');
  assert.deepEqual(decoded, original, path);
  const group = path.startsWith('/assets/backgrounds/') ? 'backgrounds'
    : path.startsWith('/assets/hexa-stats/') ? 'statIcons'
    : path.endsWith('.mp3') ? 'music'
    : binary ? 'resourceIcons' : 'text';
  const entry = groups.get(group) ?? { count: 0, originalBytes: 0, embeddedValueBytes: 0 };
  entry.count++;
  entry.originalBytes += original.length;
  entry.embeddedValueBytes += Buffer.byteLength(value);
  groups.set(group, entry);
  if (binary) media.push({ path, originalBytes: original.length, base64Bytes: value.length });
}
const modules = readdirSync(resolve(root, 'dist/server')).filter(file => file.endsWith('.js'));
const serverBytes = modules.reduce((sum, file) => sum + readFileSync(resolve(root, 'dist/server', file)).length, 0);
// Dated source evidence only. Live saved catalogues can contain other URLs.
const evidenceFiles = ['data.js', 'index.html', ...readdirSync(resolve(root, 'data'))
  .filter(file => file.endsWith('.json')).map(file => `data/${file}`)];
const remoteImages = new Map();
for (const file of evidenceFiles) {
  const source = readFileSync(resolve(root, file), 'utf8');
  for (const match of source.matchAll(/https:\/\/[^\s"'<>\\]+?\.(?:png|avif|webp|jpe?g|gif)(?:\?[^\s"'<>\\]*)?/gi)) {
    const url = new URL(match[0]);
    const paths = remoteImages.get(url.hostname) ?? new Set();
    paths.add(url.href);
    remoteImages.set(url.hostname, paths);
  }
}
console.log(JSON.stringify({
  scope: 'offline compiled build and dated public image references, not live D1 or HTTP timing',
  assets: Object.fromEntries(groups),
  worker: { rawBytes: bundle.length, localGzipBytes: gzipSync(bundle).length,
    serverModuleCount: modules.length, serverModuleRawBytes: serverBytes },
  largestMedia: media.sort((a, b) => b.originalBytes - a.originalBytes).slice(0, 5),
  datedRemoteImageReferences: Object.fromEntries([...remoteImages].sort(([a], [b]) => a.localeCompare(b))
    .map(([host, paths]) => [host, paths.size]))
}, null, 2));

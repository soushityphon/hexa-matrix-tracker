import { readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const files = readdirSync(root).filter(file => extname(file) === '.js');
for (const directory of ['scripts', 'tests', 'dist/server']) {
  for (const file of readdirSync(resolve(root, directory))) {
    if (['.js', '.mjs'].includes(extname(file))) files.push(directory + '/' + file);
  }
}
for (const file of files) {
  execFileSync(process.execPath, ['--check', resolve(root, file)], { stdio: 'pipe' });
}
console.log(`JavaScript syntax passes for ${files.length} source, test and compiled files.`);

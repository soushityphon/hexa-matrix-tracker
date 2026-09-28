#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { extractScouterOrder } from '../scouter-extract.js';

const [input, mode, ...options] = process.argv.slice(2);
if (!input || !mode || options.length > 2 || (options.length && (options[0] !== '--out' || !options[1]))) {
  console.error('Usage: node scripts/extract-scouter-order.mjs response.json taotie_heroic [--out extracted.json]');
  process.exit(2);
}
try {
  const extracted = extractScouterOrder(JSON.parse(readFileSync(input, 'utf8')), mode);
  const output = JSON.stringify(extracted, null, 2) + '\n';
  if (options.length) writeFileSync(options[1], output);
  else process.stdout.write(output);
  console.error(`${extracted.count} rows; ${extracted.unknown.length} unknown skill(s); ${extracted.validation.issues.length} validation issue(s); ${extracted.comparison?.exact ? 'matches' : 'differs from'} saved ${mode} order.`);
  if (extracted.unknown.length || extracted.validation.issues.some(issue => issue.kind !== 'material-cost')) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

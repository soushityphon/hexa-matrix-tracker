import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reconstructScouterOrder} from '../scouter-discovery.js';

const [cataloguePath,responsePath,capturedAt]=process.argv.slice(2);
if (!cataloguePath || !responsePath || !Number.isFinite(Date.parse(capturedAt))) throw new Error('Usage: node scripts/reconstruct-scouter-order.mjs CATALOGUE_JSON RESPONSE_JSON CAPTURED_AT');
const catalogue=JSON.parse(readFileSync(cataloguePath,'utf8'));
const raw=readFileSync(responsePath,'utf8');
const result=reconstructScouterOrder(JSON.parse(raw),catalogue,catalogue.selection,catalogue.sourceIconOverrides);
console.log(JSON.stringify({...result,provenance:{catalogue:catalogue.provenance,response:{capturedAt,sha256:createHash('sha256').update(raw).digest('hex')}},
  limitations:['Order remains specific to its genuine character benchmark and request options','No live data or reviewed display overrides are replaced']},null,2));
if (result.issues.length) process.exitCode=1;

import {acquireScouterCatalogue} from '../scouter-catalogue-acquisition.js';

const [job, region, world] = process.argv.slice(2);
if (!job) throw new Error('Usage: node scripts/acquire-scouter-catalogue.mjs JOB GMS|KMS Heroic|Interactive');
console.log(JSON.stringify(await acquireScouterCatalogue(job, region, world), null, 2));

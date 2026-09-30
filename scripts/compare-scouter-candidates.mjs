import {readFileSync} from 'node:fs';
import {compareScouterCandidates} from '../scouter-comparison.js';

const [beforePath,afterPath]=process.argv.slice(2);
if (!beforePath || !afterPath) throw new Error('Usage: node scripts/compare-scouter-candidates.mjs BEFORE_JSON AFTER_JSON');
const report=compareScouterCandidates(JSON.parse(readFileSync(beforePath,'utf8')),JSON.parse(readFileSync(afterPath,'utf8')));
console.log(JSON.stringify(report,null,2));

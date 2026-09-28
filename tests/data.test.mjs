import {COSTS,NODES,PRIORITIES} from '../data.js';
const assert=(x,m)=>{if(!x)throw new Error(m)};
for(const [type,rows] of Object.entries(COSTS)){assert(rows.length===30,`${type} must have 30 levels`);for(const [i,c] of rows.entries()){assert(Number.isFinite(c.erda)&&Number.isFinite(c.frags),`${type} level ${i+1} invalid`)}}
const names=new Set(NODES.map(n=>n.short));
for(const [mode,steps] of Object.entries(PRIORITIES)){assert(steps.length>0,`${mode} empty`);for(const s of steps){assert(names.has(s.skill)||s.skill.startsWith('HEXA Stat'),`${mode}: unknown skill ${s.skill}`);assert(s.level>=1&&s.level<=(s.skill.startsWith('HEXA Stat')?20:30),`${mode}: invalid level ${s.level}`)}}
console.log('Data validation passed');

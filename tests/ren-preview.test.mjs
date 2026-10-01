import assert from 'node:assert/strict';
import {captureRenPreview} from '../ren-preview.js';
import worker from '../worker.js';
const cores=['skillCore1','skillCore2','masteryCore1','reinCore1','generalCore1','generalCore2'];
const catalogue={job:'렌',skills:cores.map(coreId=>({coreId,sourceName:coreId,icon:'https://maplescouter.com/hexaskill/'+coreId+'.png',costs:{freeBaseLevel:coreId==='skillCore1'?1:0,levels:Array.from({length:30},(_,i)=>({level:i+1,erda:1,frags:3}))}})),placeholders:[{coreId:'skillCore4'},{coreId:'generalCore4'}],sourceIconOverrides:{}};
const ranking={ranking:1,name:'synthetic',job:'렌',level:287};
const profile={userApiData:{info:{character_name:'synthetic',character_class:'렌',character_level:287,world_name:'synthetic-world'},hexaSkill:{skillCore1:17,skillCore2:9,masteryCore1:8,reinCore1:7,skillCore4:0},hexaSkill_general:{generalCore1:4,generalCore2:6,generalCore4:0},hexaSkill_used:{sole_Erda:123,sole_ErdaPrice:456},hexaStat_opened:true},userStat:{stat:{myClass:'렌',characterLevel:287},hexa:{skillCore1:'17',skillCore2:'9',masteryCore1:'8',reinCore1:'7',skillCore4:'0',generalCore2:'6',generalCore4:'0',hexaStat:3},isGMS:false},calculatedData:{specEfficiency:{gain:0.013}}};
const catalogueImpl=async(job,region,world)=>({...structuredClone(catalogue),selection:{region,world}});
function responseRows(){let erda=0,frags=0;const rows=cores.map(coreId=>{erda++;frags+=3;const origin=coreId==='skillCore1';return [coreId,origin?2:1,'/hexaskill/'+coreId+'.png',1,3,erda,frags,0.5,1,coreId,origin?'1→2':'0→1'];});for(let n=1;n<=3;n++){erda+=10;frags+=100;rows.push(['Stat '+n,20,'https://open.api.nexon.com/static/maplestory/skill/icon/ABC',10,100,erda,frags,0.1,1,'hexaStat'+n,'0→20']);}return {class_hexa:rows};}
for(const region of ['KMS','GMS']) {
 const posted=[];
 const result=await captureRenPreview({apiKey:'test-key',region,catalogueImpl,fetchImpl:async(url,options)=>{
  if(url.includes('/api/ranking?'))return Response.json({rankingData:[ranking]});
  if(url.includes('/api/id?'))return Response.json(profile);
  posted.push(JSON.parse(options.body));return Response.json(responseRows());
 }});
 assert.equal(result.error,undefined);assert.equal(Object.keys(result.captures).length,2);
 assert.deepEqual(posted.map(body=>[body.userStat.isGMS,body.sole]),[[region==='GMS',false],[region==='GMS',true]]);
 assert(posted.every(body=>body.userStat.stat.characterLevel===287));
 assert(!JSON.stringify(result).includes('test-key'));assert(!Object.hasOwn(result,'userStat'));assert.equal(result.publishable,false);
}
let calls=0;
const failed=await captureRenPreview({apiKey:'test-key',catalogueImpl,fetchImpl:async(url)=>{
 if(url.includes('/api/ranking?'))return Response.json({rankingData:[ranking]});
 if(url.includes('/api/id?'))return Response.json(profile);
 calls++;return new Response('limited',{status:429});
}});
assert.equal(calls,1);assert.match(failed.error,/429/);assert.deepEqual(failed.captures,{});
const changed=structuredClone(profile);changed.userStat.stat.myClass='호영';calls=0;
const mismatch=await captureRenPreview({apiKey:'test-key',catalogueImpl,fetchImpl:async(url)=>{if(url.includes('/api/ranking?'))return Response.json({rankingData:[ranking]});if(url.includes('/api/id?'))return Response.json(changed);calls++;throw Error('private');}});
assert.equal(calls,0);assert(!JSON.stringify(mismatch).includes('private'));
const url='https://test.example/api/ren-capture';
assert.equal((await worker.fetch(new Request(url,{method:'POST',body:'{"region":"KMS"}'}),{})).status,403);
const headers={'oai-authenticated-user-email':'owner@example.test'};
assert.equal((await worker.fetch(new Request(url,{method:'POST',headers,body:'{"region":"bad"}'}),{ADMIN_EMAIL:'owner@example.test'})).status,400);
assert.equal((await worker.fetch(new Request(url,{method:'POST',headers,body:'{"region":"GMS"}'}),{ADMIN_EMAIL:'owner@example.test'})).status,503);
console.log('Ren capture review, region selectors, profile rejection, first-failure stop and owner gate passed');

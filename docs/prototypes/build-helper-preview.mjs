// Offline design prototype. Not imported by Worker/application.
import {readFileSync,writeFileSync} from 'node:fs';
import {NODES} from '../../data.js';
import {skillAccent} from '../../skill-colours.js';
import {matrixLocations} from './matrix-model.mjs';
const read=n=>JSON.parse(readFileSync(new URL('../../data/'+n,import.meta.url)));
const ren=read('scouter-ren-catalogue-2026-10-01.json');
const hy=read('scouter-kms-taotie-fragment-extracted-2026-09-28.json');
const coreIds=new Map(hy.rows.map(r=>[r.skill,r.coreId]));coreIds.set('Janus','generalCore1');
const groups={'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'};
// Display-only Ren names/tags from the owner's uploaded tracker reference.
const renNames={skillCore1:['Divided Heavens','Origin'],skillCore2:['Heartbound Verse','Ascent'],masteryCore1:['Plum Blossom: Storm','M1'],masteryCore2:['Spirit Strike','M2'],masteryCore3:['Wish Unending','M3'],masteryCore4:['Raining Blossoms','M4'],reinCore1:['Thousand Blossom Flurry',''],reinCore2:['Soul Immeasurable',''],reinCore3:['Dancing Annihilation',''],reinCore4:['Blade of the Unbound Heart',''],generalCore1:['Sol Janus',''],generalCore2:['Sol Hecate',''],generalCore3:['Lotus Flower','']};
const hyTags={Apotheosis:'Origin',Ascent:'Ascent',Harmony:'M1',Basics:'M2',Talisman:'M3',Scroll:'M4'};
const models={ren:ren.skills.map(s=>({...s,name:renNames[s.coreId]?.[0]||s.sourceName,tag:renNames[s.coreId]?.[1]||'',short:'ren_'+s.coreId})),hoyoung:NODES.map(n=>({...n,category:groups[n.group],coreId:coreIds.get(n.short),tag:hyTags[n.short]||''}))};
const iconsRoot=process.argv[2];if(!iconsRoot)throw new Error('Pass downloaded original icon directory');
for(const skills of Object.values(models))for(const s of skills){
 const basename=s.icon.split('/').at(-1).replace('General_2_0.png','General_2.png');
 const bytes=readFileSync(iconsRoot+'/'+basename);if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Original PNG required');
 s.image='data:image/png;base64,'+bytes.toString('base64');s.accent=skillAccent(s.short);
}
const central=readFileSync(new URL('./centre-reference.webp',import.meta.url));
const centreImage='data:image/webp;base64,'+central.toString('base64');
const resourceImage='data:image/png;base64,'+readFileSync(new URL('../../assets/sol-erda.png',import.meta.url)).toString('base64');
function render(models,job='ren',region='GMS',target='masteryCore3',show=true,explain=false,centre=false){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const skills=models[job],active=new Set(skills.filter(s=>region==='KMS'||s.coreId!=='skillCore3').map(s=>s.coreId));
 const locations=matrixLocations(skills,active),selected=skills.find(s=>s.coreId===target&&active.has(s.coreId))||skills.find(s=>s.coreId==='masteryCore3');
 const hex=(x,y,r)=>Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return `${x+Math.cos(a)*r},${y+Math.sin(a)*r}`}).join(' ');
 const rect=(x,y,w,h,fill,stroke='#51454a',rx=4)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
 const text=(x,y,s,size=14,fill='#d8d0d3',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(s)}</text>`;
 const image=(x,y,w,src)=>`<image x="${x}" y="${y}" width="${w}" height="${w}" href="${src}" xlink:href="${src}"/>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 760" role="img" aria-label="Helper Matrix and 50/50 Summary prototype"><style>text{font-family:DejaVu Sans,sans-serif}.tile{cursor:default}</style>${rect(0,0,1200,760,'#181416','none',0)}`;
 svg+=text(32,35,'MAPLESTORY / '+region,12,'#c7a4b0',600)+text(32,72,'HEXA Matrix Tracker',28,'#eee5e8',700);
 svg+=text(32,108,(job==='ren'?'Ren':'Hoyoung')+'   /   '+(region==='GMS'?'Lotus':'Taotie')+'   /   Fragments (Heroic)',14);
 svg+=rect(985,82,80,34,'#41333b')+text(998,104,'Tracker',13)+rect(1071,82,101,34,'#694a5c')+text(1081,104,'Infographic',13);
 svg+=rect(24,133,1152,365,'#211b1f')+text(44,164,'HEXA Matrix Summary',17,'#eadfe4',700)+text(1035,164,show?'☑ Helper':'☐ Helper',14,'#d8bcc8');
 if(show){
 svg+=`<line x1="600" y1="184" x2="600" y2="477" stroke="#53414c"/>`;
 svg+=`<g transform="translate(31,184) scale(.71)">`;
 for(const s of locations){const upper=['Skill','Mastery'].includes(s.category),chosen=s.skill?.coreId===selected.coreId&&s.available;
 svg+=`<g data-core="${s.available?s.skill.coreId:''}" opacity="${chosen?1:s.available?.4:.2}"><polygon points="${hex(s.x,s.y,32)}" fill="${chosen?'#51404e':upper?'#3d2e57':'#2a3b4b'}" stroke="${chosen?selected.accent:upper?'#9682b5':'#8296a7'}" stroke-width="${chosen?4:1.5}"/>`;
 if(s.available)svg+=image(s.x-16,s.y-16,32,s.skill.image);
 else svg+=`<rect x="${s.x-7}" y="${s.y-2}" width="14" height="13" rx="2" fill="#6a6376"/><path d="M${s.x-5} ${s.y-2}v-5a5 5 0 0 1 10 0v5" fill="none" stroke="#6a6376" stroke-width="3"/>`;
 svg+='</g>';
 }
 svg+=`<polygon points="${hex(220,208,24)}" fill="#302738" stroke="#776581" stroke-width="2"/>`;
 if(centre)svg+=image(196,184,48,centreImage);
 svg+='</g>';
 svg+=image(358,213,32,selected.image);if(selected.tag)svg+=rect(400,218,37,23,'#4b474d','none')+text(407,235,selected.tag,12);
 svg+=text(358,279,selected.name,selected.name.length>25?12:16,'#e8dde4',700);
 if(explain)svg+=text(358,322,'Example explanation',14,'#dbc7d4',700)+text(358,348,'Text entered in Admin',13)+text(358,368,'can use bold and line breaks.',13)+text(358,409,'Preview text only.',11,'#a1939e');
 }
 const sx=show?625:44,sw=show?522:1105;
 svg+=text(sx,218,'HEXA Matrix Completion',15,'#e0d0d8',600)+text(sx+sw-70,219,'24.8%',18,'#d5b1c1',700);
 svg+=rect(sx,234,sw,22,'#332a30','none',2)+rect(sx,234,sw*.248,22,'#a8788f','none',2);
 svg+=text(sx,301,'Total Materials Spent',14,'#dfd0d8',600)+image(sx,321,26,resourceImage)+text(sx+38,341,'182 Sol Erda   ·   4,216 Fragments',16);
 svg+=text(sx,387,'Materials to Complete HEXA Matrix',14,'#dfd0d8',600)+text(sx,421,'652 Sol Erda   ·   12,784 Fragments',16)+text(sx,463,'Illustrative figures, no calculation change.',11,'#9e909a');
 svg+=rect(24,513,1152,171,'#211b1f')+text(44,549,'HEXA Upgrade Priority',18,'#eadfe4',700)+text(44,574,(job==='ren'?'Ren':'Hoyoung')+' · '+(region==='GMS'?'Lotus':'Taotie')+' · Fragments (Heroic)',13,'#bd96a8');
 const row=['masteryCore3','masteryCore1','masteryCore2','generalCore2','masteryCore4','reinCore4','reinCore1','generalCore3'];
 row.forEach((id,i)=>{const s=skills.find(s=>s.coreId===id);const x=47+i*138;svg+=`<g class="tile" data-core="${id}">${rect(x,594,106,64,id===selected.coreId?'#4c3a47':'#2c242a',id===selected.coreId?s.accent:'#54464f')}${image(x+10,609,32,s.image)}${text(x+54,635,i<3?['1','6','1'][i]:'1',14,'#dfd1d9',700)}</g>`;if(i<7)svg+=text(x+116,633,'›',22,'#97838e');});
 svg+=text(300,724,'A project by Soushi',12,'#c9a8b8')+text(430,724,'Data sourced from MapleScouter and community resources on Inven and Naver.',12,'#a99aa4');
 return svg+'</svg>';
}
const initial=render(models);writeFileSync(new URL('./helper-preview.svg',import.meta.url),initial);
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Helper visual prototype</title><style>body{margin:0;background:#151214;color:#ddd;font:14px sans-serif}aside{padding:16px 24px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;background:#292129}select,button{font:inherit;padding:7px;background:#352c33;border:1px solid #6b5363;color:#eee}main{max-width:1200px;margin:auto}svg{display:block;width:100%;height:auto}.note{padding:10px 24px;color:#b7a4b0}label{display:flex;gap:6px;align-items:center}</style><aside><strong>Visual prototype</strong><select id="job"><option value="ren">Ren</option><option value="hoyoung">Hoyoung</option></select><select id="region"><option>GMS</option><option>KMS</option></select><label><input type="checkbox" id="helper" checked>Helper</label><label><input type="checkbox" id="explain">Example explanation</label><label><input type="checkbox" id="centre">Reference centre icon</label><span>No saves or live data changes</span></aside><main id="preview">${initial}</main><p class="note">Hover a priority icon to preview its Matrix position. Pointer exit restores Wish Unending or Talisman. These tiles do not complete upgrades. Prototype controls and sample figures are separate from the live app. HEXA Stat placement remains undecided.</p><script type="module">const models=${JSON.stringify(models)};const centreImage=${JSON.stringify(centreImage)};const resourceImage=${JSON.stringify(resourceImage)};const matrixLocations=${matrixLocations.toString()};const quadrants=${JSON.stringify((await import('./matrix-model.mjs')).quadrants)};const render=${render.toString()};let target='masteryCore3';const q=id=>document.getElementById(id);function draw(){q('preview').innerHTML=render(models,q('job').value,q('region').value,target,q('helper').checked,q('explain').checked,q('centre').checked)}document.querySelectorAll('aside select,aside input').forEach(c=>c.addEventListener('change',draw));q('preview').addEventListener('pointerover',e=>{const tile=e.target.closest('.tile');if(tile&&target!==tile.dataset.core){target=tile.dataset.core;draw()}});q('preview').addEventListener('pointerout',e=>{if(e.target.closest('.tile')&&!e.relatedTarget?.closest?.('.tile')&&target!=='masteryCore3'){target='masteryCore3';draw()}});q('preview').addEventListener('pointerleave',()=>{target='masteryCore3';draw()});</script></html>`;
writeFileSync(new URL('./helper-preview.html',import.meta.url),html);
console.log('Built self-contained HTML and SVG with original icons; no app integration.');

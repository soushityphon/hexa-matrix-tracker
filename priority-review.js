import {renDraftFromCapture,renSkillKey} from './ren-priority.js';
import { NODES, STAT_ICONS } from './data.js';
import { inspectScouterResponse } from './scouter-import.js';
import { extractScouterOrder } from './scouter-extract.js';
import { capturedCatalogueCosts, categories, defaultTags, trackerSkill, mergeSkills, validateSkills, validatePair, priorityGroups, orderMatches } from './admin-panel-model.js';
import { skillAccent } from './skill-colours.js';

const $ = selector => document.querySelector(selector);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
let captureCatalogue = null;
let drafts = {}, priorityRevisions = {}, invalidRecords = [], rows = [], orders = {}, captureRegion = null, skillDirty = false, skillsRevision = null, loaded = false, busy = false;
const cache = new Map();
const classStates=new Map();
const pendingNames=new Map();
let currentJob='호영', currentView='skills';
const isRen=()=>currentJob==='렌';
const jobLabel=()=>isRen()?'Ren':'Hoyoung';
const pauseKey = 'hexa-scouter-pause-until';
let pauseUntil = 0;
try { pauseUntil = Number(sessionStorage.getItem(pauseKey)) || 0; } catch { /* In-page fallback. */ }
const sourceMode = (region, world) => `${region === 'KMS' ? 'taotie' : 'lotus'}_${world}`;
function message(text, error = false) { $('#status').textContent = text; $('#status').classList.toggle('error', error); }
async function request(url, method='GET', value) {
  const response = await fetch(url,{method,cache:'no-store',...(value === undefined ? {} : {headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})});
  if (!response.ok) throw new Error((await response.text()).slice(0,200) || `Request returned ${response.status}`);
  return response.json();
}
async function cachedRequest(key, url, method, value) {
  const old = cache.get(key);
  if (old && Date.now()-old.at < 300000) return structuredClone(old.value);
  const result = await request(url,method,value); cache.set(key,{at:Date.now(),value:result}); return result;
}
function controls() {
  $('#grab').disabled = !loaded || busy;
  $('#save-skills').disabled = !loaded || busy || !rows.length;
  $('#load-latest-skills').disabled = !loaded || busy;
  $('#load-latest-priorities').disabled = !loaded || busy;
  for(const button of document.querySelectorAll('.registered-actions button'))button.disabled=busy;
  $('#add-tags').disabled = !loaded || busy || !rows.length;
  $('#save-pair').disabled = !loaded || busy || !orders.heroic || !orders.interactive || captureRegion !== $('#region').value;
  for(const input of document.querySelectorAll('#skills input, #skills select'))input.disabled=busy;
  $('#job').disabled = busy; $('#region').disabled = busy;
  $('#hoyoung-tab').disabled=busy;$('#ren-tab').disabled=busy;
  $('#response-file').disabled=isRen()||busy;$('#backup').disabled=busy;
}
function tab(name) {
  currentView=name;
  for (const key of ['skills','priorities']) { const selected = key === name; $(`#${key}-tab`).setAttribute('aria-selected', String(selected)); $(`#${key}-tab`).tabIndex = selected ? 0 : -1; $(`#${key}-panel`).hidden = !selected; }
}
for (const name of ['skills','priorities']) {
  $(`#${name}-tab`).addEventListener('click',()=>tab(name));
  $(`#${name}-tab`).addEventListener('keydown',event=>{if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {event.preventDefault();const next=event.key==='Home'?'skills':event.key==='End'?'priorities':name==='skills'?'priorities':'skills';tab(next);$(`#${next}-tab`).focus();}});
}
function icon(source) {
  const box = el('span', source.sourceName?.[0] || '?', 'skill-icon');
  const img = el('img'); img.src = source.effectiveIcon || source.icon; img.alt = ''; img.addEventListener('error',()=>{img.hidden=true;}); box.append(img); return box;
}
function field(label, row, key, options) {
  const wrapper = el('label',label);
  const input = el(options ? 'select' : 'input');
  if (options) for (const value of ['',...options]) input.append(new Option(value || 'Choose category',value));
  else {input.type='text';input.maxLength=120;}
  input.value = row[key] || '';
  input.addEventListener('input',()=>{row[key]=input.value;skillDirty=true;});
  wrapper.append(input); return wrapper;
}
function renderSkills() {
  $('#skill-count').textContent = `(${rows.length})`; $('#skills').replaceChildren();
  if (!rows.length) {$('#skills').append(el('p','Grab Scouter info to load this class’s skills.','fine'));return;}
  for (const row of rows) {
    const card=el('div',undefined,'skill-row');card.style.setProperty('--skill-accent',skillAccent(trackerSkill(row.source)?.short || row.coreId));
    const identity=el('div',undefined,'skill-identity'), text=el('span');text.append(el('strong',row.source.sourceName),el('small',row.coreId));identity.append(icon(row.source),text);
    card.append(identity,field('Long name',row,'name'),field('Short name',row,'shortName'),field('Category',row,'category',row.coreId.startsWith('hexastat') ? ['HEXA Stat'] : categories.filter(category=>category!=='HEXA Stat')),field('Tag',row,'tag'));
    if (row.conflicts?.length) {
      const conflict=el('label','Saved versions use different names. Choose one or enter your own.','skill-conflict'), select=el('select');select.append(new Option('Choose saved names',''));
      row.conflicts.forEach((value,i)=>select.append(new Option(`${value.name} / ${value.shortName}`,String(i))));
      select.addEventListener('change',()=>{if(select.value==='')return;Object.assign(row,row.conflicts[Number(select.value)],{conflicts:[]});skillDirty=true;renderSkills();});conflict.append(select);card.append(conflict);
    }
    $('#skills').append(card);
  }
}
function draftFromResponse(response, region, world, catalogue) {
  if (!catalogue || catalogue.selection.region !== region || catalogue.job !== $('#job').value) throw new Error('Import the response with its captured Scouter catalogue.');
  const {capturedCosts,costProvenance} = capturedCatalogueCosts(catalogue);
  const mode=sourceMode(region,world), extracted=extractScouterOrder(response,mode,{},capturedCosts);
  if (extracted.unknown.length) throw new Error(`${extracted.unknown.length} unfamiliar skills need tracker support. Their names can be reviewed in Skills.`);
  if (extracted.validation.issues.length) throw new Error('The response did not pass the existing order checks. No priorities were changed.');
  const inspected=inspectScouterResponse(response);
  return {capturedCosts,costProvenance,sourceMode:mode,steps:extracted.steps,statIcons:inspected.statIcons,newNodes:[],names:Object.fromEntries(NODES.map(node=>[node.short,node.name])),shortNames:Object.fromEntries(NODES.map(node=>[node.short,node.short])),source:`Maple Scouter ${region}, checked ${new Date().toISOString()}, benchmark ${String(response.standard || 'not recorded').slice(0,80)}`};
}
function renderOrders() {
  $('#order-context').textContent = captureRegion ? `${jobLabel()} · ${captureRegion} source` : 'Grab Scouter info to review both orders.';
  $('#order-results').replaceChildren();
  for(const world of ['heroic','interactive']) {
    const order=orders[world],card=el('article',undefined,'order-card');card.append(el('h3',world==='heroic'?'Heroic':'Interactive'));
    if(!order) card.append(el('p','No order loaded.'));
    else {
      const matches=orderMatches(order.steps,world,drafts);
      card.append(el('p',`${order.steps.length} ordered checkpoints`),el('p',matches.length?`Matches ${matches.map(draft=>draft.name).join(', ')}`:'Different from saved orders.'));
      const fd=order.steps.filter(step=>step.fdGain!==undefined).length;card.append(el('p',`${fd} checkpoints with source FD. HEXA Stats retain RNG treatment.`));
      const details=el('details'),list=el('ol');details.append(el('summary','Inspect order'));
      for(const step of order.steps) list.append(el('li',`${isRen()?(rows.find(row=>trackerSkill(row.source,'렌')?.short===step.skill)?.shortName || order.sourceSkills?.find(source=>renSkillKey(source.coreId)===step.skill)?.sourceName || step.skill):step.skill} → ${step.level}${step.fdGain===undefined?'':` · FD ${step.fdGain.toFixed(3)}%`}`));details.append(list);card.append(details);
    }
    $('#order-results').append(card);
  }
  controls();
}
function download(value,name) {
  const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}), url=URL.createObjectURL(blob), link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function mutation(method,value) {await request('/api/admin-panel',method,value);await reload();}
function renderRegistered() {
  const groups=priorityGroups(drafts);$('#priority-count').textContent=`(${groups.length})`;$('#registered').replaceChildren();
  if(invalidRecords.length) {
    const warning=el('section',undefined,'invalid-priorities');warning.setAttribute('aria-label','Damaged priority records');
    warning.append(el('h3',`Damaged records (${invalidRecords.length})`),el('p','These records are preserved and excluded from usable priorities. This list covers all classes because damaged data may not identify its class. Download the raw record for recovery. Imports cannot replace its ID.','fine'));
    for(const record of invalidRecords) {
      const card=el('article',undefined,'registered-row'),details=el('div',undefined,'registered-details'),button=el('button','Download raw record');
      details.append(el('strong',record.mode),el('small',record.reason));
      button.addEventListener('click',async()=>{button.disabled=true;try{download(await request('/api/admin-panel?record='+encodeURIComponent(record.mode)),'hexa-damaged-priority.json');}catch(error){message(error.message,true);}finally{button.disabled=false;}});
      card.append(details,button);warning.append(card);
    }
    $('#registered').append(warning);
  }
  if(!groups.length) $('#registered').append(el('p','No saved priorities.','fine'));
  for(const group of groups) {
    const priorityRevision=priorityRevisions[group.id];
    const card=el('article',undefined,'registered-row'),details=el('div',undefined,'registered-details'),actions=el('div',undefined,'registered-actions');
    details.append(el('strong',group.name),el('small',group.drafts.map(draft=>`${draft.sourceMode.endsWith('_heroic')?'Heroic':'Interactive'} · ${draft.steps.length} steps · ${draft.enabled?'Available':'Unavailable'}`).join(' / ')),el('small',`${group.createdAt || 'Date not recorded'}${group.drafts[0].sourceRegion ? ` · ${group.drafts[0].sourceRegion} source` : ' · Existing saved version'}`));
    const button=(label,handler)=>{const btn=el('button',label);btn.addEventListener('click',async()=>{if(busy)return;busy=true;controls();try{await handler();}catch(error){message(error.message,true);}finally{busy=false;controls();}});actions.append(btn);return btn;};
    const enabled=group.drafts.every(draft=>draft.enabled);
    button(enabled?'Make unavailable':'Make available',async()=>{await mutation('PATCH',{id:group.id,enabled:!enabled,priorityRevision});message('Priority availability saved.');});
    button('Rename',async()=>{const name=prompt('Priority name',pendingNames.get(group.id) ?? group.name);if(name?.trim()){pendingNames.set(group.id,name);await mutation('PATCH',{id:group.id,name,priorityRevision});pendingNames.delete(group.id);message('Priority name saved.');}});
    button('Download',()=>download({schema:1,type:'hexa-priority-backup',name:group.name,drafts:group.drafts,skills:rows.length?{job:currentJob,rows}:null},`hexa-${group.id}.json`));
    button('Delete',async()=>{if(confirm(`Delete ${group.name} and its ${group.drafts.length} saved order(s)?`)){await mutation('DELETE',{id:group.id,priorityRevision});pendingNames.delete(group.id);message('Priority deleted.');}});
    card.append(details,actions);$('#registered').append(card);
  }
}
async function reload() {
  const result=await request('/api/admin-panel?job='+encodeURIComponent(currentJob));drafts=result.drafts;priorityRevisions=result.priorityRevisions || {};invalidRecords=result.invalidRecords || [];
  if(!skillDirty) {rows=result.skills?.rows || rows;skillsRevision=result.skillsRevision;}
  renderSkills();renderRegistered();renderOrders();
}
async function selectClass(job) {
  if(busy||job===currentJob)return;
  classStates.set(currentJob,{drafts,priorityRevisions,rows,orders,captureRegion,captureCatalogue,skillDirty,skillsRevision,region:$('#region').value,view:currentView,note:$('#capture-note').textContent,pairName:$('#pair-name').value});
  currentJob=job;$('#job').value=job;
  const saved=classStates.get(job);
  ({drafts,priorityRevisions,rows,orders,captureRegion,captureCatalogue,skillDirty,skillsRevision}=saved || {drafts:{},priorityRevisions:{},rows:[],orders:{},captureRegion:null,captureCatalogue:null,skillDirty:false,skillsRevision:null});
  $('#pair-name').value=saved?.pairName || '';
  $('#region').value=saved?.region || (isRen()?'KMS':'GMS');$('#capture-note').textContent=saved?.note || '';
  for(const [id,value] of [['hoyoung-tab','호영'],['ren-tab','렌']]) {const selected=job===value;$('#'+id).setAttribute('aria-selected',String(selected));$('#'+id).tabIndex=selected?0:-1;}
  $('#class-panel').setAttribute('aria-labelledby',isRen()?'ren-tab':'hoyoung-tab');
  $('#section-tabs').setAttribute('aria-label',jobLabel()+' sections');
  $('#class-note').hidden=!isRen();$('#class-note').textContent='Ren uses the rank 1 KMS benchmark. Save a named Heroic/Interactive pair, then manage availability under Saved priorities.';
  tab(saved?.view || 'skills');renderSkills();renderRegistered();renderOrders();
  busy=true;controls();try {await reload();message(`${jobLabel()} data is ready.`);}catch(error){message(error.message,true);}finally{busy=false;controls();}
}
for(const [id,job] of [['hoyoung-tab','호영'],['ren-tab','렌']]) {
  $('#'+id).addEventListener('click',()=>selectClass(job));
  $('#'+id).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'호영':event.key==='End'?'렌':job==='렌'?'호영':'렌';selectClass(next).then(()=>$(next==='렌'?'#ren-tab':'#hoyoung-tab').focus());}});
}
$('#region').addEventListener('change',()=>{orders={};captureRegion=null;$('#capture-note').textContent='';renderOrders();});
$('#grab').addEventListener('click',async()=>{
  if(Date.now()<pauseUntil){message('Scouter refused a recent request. Wait five minutes before trying again.',true);return;}
  busy=true;controls();const region=$('#region').value;orders={};captureRegion=region;renderOrders();
  try {
    if(isRen()) {
      message('Grabbing the rank 1 Ren profile and Scouter priorities…');
      const result=await cachedRequest('ren-preview:'+region,'/api/ren-capture','POST',{region});
      if(result.catalogue) {captureCatalogue=structuredClone(result.catalogue);rows=mergeSkills(result.catalogue,rows,{});skillDirty=true;}
      for(const [world,candidate] of Object.entries(result.captures || {})) {
        orders[world]=renDraftFromCapture(candidate,result.catalogue);
        const stats=candidate.steps.filter(step=>/^hexaStat[123]$/i.test(step.coreId)).map(step=>({coreId:step.coreId.toLowerCase(),sourceName:step.sourceName,icon:step.icon,category:'HEXA Stat'}));
        rows=mergeSkills({job:'렌',skills:stats},rows,{});
      }
      const b=result.benchmark;
      $('#capture-note').textContent=b?`${b.name} · level ${b.characterLevel} · KMS rank 1 benchmark` : '';
      renderSkills();renderOrders();
      if(result.error)throw new Error(result.error);
      message('Ren priorities are ready. Save any skill-name edits, then name and save the priority pair.');
      return;
    }
    message('Grabbing Scouter skills, icons and costs…');
    const catalogue=await cachedRequest(`catalogue:${currentJob}:${region}`,`/api/scouter-catalogue?job=${encodeURIComponent($('#job').value)}&region=${region}&world=Heroic`);
    captureCatalogue = structuredClone(catalogue);
    rows=mergeSkills(catalogue,rows,drafts);skillDirty=true;renderSkills();
    for(const world of ['heroic','interactive']) {
      message(`Grabbing ${world==='heroic'?'Heroic':'Interactive'} priority and FD…`);
      const mode=sourceMode(region,world), old=cache.get(mode);
      let capture;
      if (old && Date.now()-old.at < 300000) capture=structuredClone(old.value);
      else {
        const response=await request('/api/hexa-order','POST',{mode});
        capture={response,catalogue:structuredClone(captureCatalogue)};
        cache.set(mode,{at:Date.now(),value:structuredClone(capture)});
      }
      orders[world]=draftFromResponse(capture.response,region,world,capture.catalogue);
      const stats=Object.entries(orders[world].statIcons).map(([short,icon],i)=>({coreId:'hexastat'+(['HEXA Stat I','HEXA Stat II','HEXA Stat III'].indexOf(short)+1),sourceName:short,icon}));
      rows=mergeSkills({skills:stats},rows,drafts);renderSkills();renderOrders();
    }
    $('#capture-note').textContent=`${region} · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC`;
    message('Scouter info is ready. Review Skills, then name and save the priority pair.');
  } catch(error) {
    if(/429|430/.test(error.message)) {pauseUntil=Date.now()+300000;try{sessionStorage.setItem(pauseKey,String(pauseUntil));}catch{}}
    message(`${error.message} The remaining requests were stopped. Saved data is unchanged.`,true);
  } finally {busy=false;controls();renderOrders();}
});
$('#add-tags').addEventListener('click',()=>{for(const row of rows){const tag=isRen()?row.source.tag:defaultTags[trackerSkill(row.source)?.short];if(tag && !row.tag) row.tag=tag;}skillDirty=true;renderSkills();message('Standard tags added to empty fields. Save skills to keep them.');});
$('#save-skills').addEventListener('click',async()=>{
  busy=true;controls();
  try {const review=validateSkills({job:currentJob,rows});const result=await request('/api/admin-panel','PUT',{...review,skillsRevision});skillsRevision=result.skillsRevision;skillDirty=false;await reload();message(`Skills saved for ${jobLabel()}. Saved priority orders are unchanged.`);}
  catch(error){message(error.message,true);}finally{busy=false;controls();}
});
$('#load-latest-skills').addEventListener('click',async()=>{
  if(skillDirty && !confirm('Discard your unsaved skill edits and load the latest saved skills?'))return;
  busy=true;controls();
  try {
    const result=await request('/api/admin-panel?job='+encodeURIComponent(currentJob));
    rows=result.skills?.rows || [];skillsRevision=result.skillsRevision;skillDirty=false;
    drafts=result.drafts;priorityRevisions=result.priorityRevisions || {};invalidRecords=result.invalidRecords || [];
    renderSkills();renderRegistered();renderOrders();message(`Latest ${jobLabel()} skills loaded. Review them before saving.`);
  }catch(error){message(error.message,true);}finally{busy=false;controls();}
});
$('#load-latest-priorities').addEventListener('click',async()=>{
  busy=true;controls();
  try{await reload();message('Latest priorities loaded. Review them before changing a saved priority. Unsaved skill edits and priority names are kept.');}
  catch(error){message(error.message,true);}finally{busy=false;controls();}
});
$('#save-pair').addEventListener('click',async()=>{
  busy=true;controls();
  try {
    const pair={job:currentJob,id:'pair_'+crypto.randomUUID().replaceAll('-',''),name:$('#pair-name').value,enabled:false,region:captureRegion,orders};
    validatePair(pair);await mutation('POST',pair);$('#pair-name').value='';message('Priority saved as unavailable. Use Make available under Saved priorities when ready.');
  }catch(error){message(error.message,true);}finally{busy=false;controls();}
});
$('#response-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>250000)throw new Error('Response file is too large');const world=$('#import-world').value,region=$('#region').value;const capture=JSON.parse(await file.text());orders[world]=draftFromResponse(capture.response,region,world,capture.catalogue);captureRegion=region;renderOrders();message(`${world==='heroic'?'Heroic':'Interactive'} response loaded for review.`);}catch(error){message(error.message,true);}finally{event.target.value='';}
});
$('.upload-button').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('#backup').click();}});
$('#backup').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try {
    if(file.size>250000)throw new Error('Backup file is too large');
    const backup=JSON.parse(await file.text());
    if(backup.type==='hexa-tracker-backup') {
      if(!confirm('Restore this tracker backup? Restored priorities start unavailable. Existing records will not be overwritten.'))return;
      await mutation('POST',{restoreSnapshot:backup});message('Tracker backup restored. Review Skills before making priorities available.');return;
    }
    if((backup.drafts?.[0]?.job || '호영')!==currentJob)throw new Error('Open the matching class tab before restoring this priority.');
    if(backup.type!=='hexa-priority-backup' || !Array.isArray(backup.drafts) || ![1,2].includes(backup.drafts.length))throw new Error('Upload a priority backup downloaded from this panel.');
    if(backup.drafts.length===1) {
      const name=prompt('Name for restored priority',backup.name);if(!name?.trim())return;
      await mutation('POST',{legacyDraft:{...backup.drafts[0],pairId:undefined,pairName:undefined,sourceRegion:undefined,createdAt:undefined,mode:'restore_'+crypto.randomUUID().replaceAll('-',''),isNew:true,name,enabled:false}});
      message('Saved version restored as unavailable. Existing data is unchanged.');return;
    }
    const heroic=backup.drafts.find(draft=>draft.sourceMode.endsWith('_heroic')),interactive=backup.drafts.find(draft=>draft.sourceMode.endsWith('_interactive'));
    if(!heroic || !interactive || heroic.sourceMode.split('_')[0]!==interactive.sourceMode.split('_')[0])throw new Error('Backup orders must belong to the same captured update');
    const name=prompt('Name for restored priority pair',backup.name);if(!name?.trim())return;
    const pair={job:heroic.job || '호영',id:'pair_'+crypto.randomUUID().replaceAll('-',''),name,enabled:false,region:heroic.sourceRegion || (heroic.sourceMode.startsWith('taotie_')?'KMS':'GMS'),orders:{heroic,interactive}};
    validatePair(pair);await mutation('POST',pair);message('Backup restored as unavailable. Existing priorities and skill names are unchanged.');
  }catch(error){message(error.message,true);}finally{event.target.value='';}
});
try {await reload();loaded=true;controls();message('Saved data is ready.');}catch(error){message(`Saved data could not load: ${error.message}`,true);}

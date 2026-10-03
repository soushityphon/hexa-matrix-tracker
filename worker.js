// Bundled with the static files by scripts/build-worker.mjs.
import { validateSkills, validatePair, applySkills, trackerCatalogue, requireOrderSkills } from './admin-panel-model.js';
import { validateDraft } from './priority-draft.js';
import {renCatalogueFromDrafts} from './ren-priority.js';
import { cachedRenPreview } from './ren-preview.js';
import { scouterRequestContext } from './scouter-request-context.js';
import { acquireScouterCatalogue, catalogueSelection } from './scouter-catalogue-acquisition.js';
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
const scouterUrl = 'https://api.maplescouter.com/api/calc/hexa-order?class=%ED%98%B8%EC%98%81';
const noStore = { 'Cache-Control': 'no-store' };
function isAdmin(request, env) {
  return !!env?.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
}
// Only code-owned labels and aggregate counts reach the server log. Never pass
// records, request values or exception objects to this helper.
function serverDiagnostic(route,event,operation,category,count=1) {
  try { console.warn(JSON.stringify({event,route,operation,category,count})); } catch { /* Logging cannot interrupt recovery. */ }
}
class ServerDataFailure extends Error {}
const isInsertCollision = error => /UNIQUE constraint failed: (?:priority_preview.mode|admin_skills.job)/.test(String(error?.message));
async function storageOperation(route,operation,action,allowCollision=false) {
  try { return await action(); }
  catch(error) {
    if(allowCollision && isInsertCollision(error))throw error;
    serverDiagnostic(route,'storage_failure',operation,'database');
    throw new ServerDataFailure('Storage unavailable');
  }
}
function invalidCategory(error) {
  return error instanceof SyntaxError ? 'json' : error instanceof TypeError ? 'shape' : 'validation';
}
function readStoredSkills(row,route) {
  if(!row)return null;
  try { const value=JSON.parse(row.review_json);validateSkills(value);return value; }
  catch(error) {
    serverDiagnostic(route,'invalid_record','skills_read',invalidCategory(error));
    throw new ServerDataFailure('Stored skills unavailable');
  }
}
function readPriorityRows(rows,route) {
  const drafts = Object.create(null), invalidRecords = [];
  const counts={json:0,shape:0,identity:0,validation:0};
  for (const row of rows) {
    let identityMismatch=false;
    try {
      const draft = validateDraft(JSON.parse(row.draft_json));
      if (draft.mode !== row.mode) {identityMismatch=true;throw new Error('Stored ID does not match the priority ID');}
      drafts[row.mode] = draft;
    } catch (error) {
      const reason = error instanceof SyntaxError ? 'Stored data is not valid JSON' :
        error instanceof TypeError ? 'Stored priority has an unsupported field shape' : error.message;
      invalidRecords.push({mode:row.mode, reason});
      counts[identityMismatch?'identity':invalidCategory(error)]++;
    }
  }
  for(const [category,count] of Object.entries(counts))if(count)serverDiagnostic(route,'invalid_record','priorities_read',category,count);
  return {drafts, invalidRecords};
}
async function priorityPreview(request, env) {
  if (!env?.DB) {serverDiagnostic('priority-preview','storage_failure','binding','missing');return new Response('Priority preview storage is unavailable', { status: 503 });}
  try {
    if (request.method === 'GET') {
      const mode=new URL(request.url).searchParams.get('record');
      if(mode!==null) {
        if(!isAdmin(request,env))return new Response('Admin access required',{status:403,headers:noStore});
        if(!/^[a-z0-9_]+$/.test(mode))return new Response('Invalid priority ID',{status:400,headers:noStore});
        const row=await storageOperation('priority-preview','read',()=>env.DB.prepare('SELECT mode, draft_json, updated_at FROM priority_preview WHERE mode = ?').bind(mode).first());
        if(row && readPriorityRows([row],'priority-preview').invalidRecords.length)return new Response('Damaged priority is preserved. Download its raw record from the Admin Panel.',{status:409,headers:noStore});
        return Response.json({mode,draft:row?readPriorityRows([row],'priority-preview').drafts[mode]:null,revision:await priorityRevision('record:'+mode,row?[row]:[])},{headers:noStore});
      }
      const rows = await storageOperation('priority-preview','read',()=>env.DB.prepare('SELECT mode, draft_json FROM priority_preview').all());
      const drafts=Object.fromEntries(Object.entries(readPriorityRows(rows.results || [],'priority-preview').drafts).filter(([,draft])=>!draft.newNodes.length));
      const job=new URL(request.url).searchParams.get('job');
      if(job&&!['호영','렌'].includes(job))return new Response('Choose Hoyoung or Ren',{status:400,headers:noStore});
      let visible={};
      for(const sourceJob of ['호영','렌']) {
        if(job&&job!==sourceJob)continue;
        const review=await storageOperation('priority-preview','read',()=>env.DB.prepare('SELECT review_json FROM admin_skills WHERE job = ?').bind(sourceJob).first());
        const skills=readStoredSkills(review,'priority-preview');
        const scoped=applySkills(Object.fromEntries(Object.entries(drafts).filter(([,draft])=>(draft.job || '호영')===sourceJob)),skills);
        for(const draft of Object.values(scoped)){try{requireOrderSkills([draft],skills);}catch{draft.enabled=false;}}
        Object.assign(visible,scoped);
      }
      return Response.json({ drafts:visible }, { headers:noStore });
    }
    if (!['PUT', 'DELETE'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    if (!isAdmin(request, env)) return new Response('Admin access required', { status: 403 });
    if (Number(request.headers.get('content-length')) > 100_000) return new Response('Payload too large', { status: 413 });
    const body = await request.text();
    if (body.length > 100_000) return new Response('Payload too large', { status: 413 });
    let selection;
    try { selection = JSON.parse(body); } catch { return new Response('Invalid JSON', { status: 400 }); }
    let draft;
    if(request.method==='PUT') {
      try { draft = validateDraft(selection?.draft); }
      catch (error) { return new Response(error.message, { status: 400 }); }
      if(draft.newNodes.length)return new Response('New skills need a reviewed GitHub update before their costs can be used in the tracker',{status:400});
    }
    const mode=draft?.mode || selection?.mode;
    if(typeof mode!=='string' || !/^[a-z0-9_]+$/.test(mode))return new Response('Invalid priority ID',{status:400,headers:noStore});
    const previous=await storageOperation('priority-preview','read',()=>env.DB.prepare('SELECT mode, draft_json, updated_at FROM priority_preview WHERE mode = ?').bind(mode).first());
    if(previous && readPriorityRows([previous],'priority-preview').invalidRecords.length)return new Response('Damaged priority is preserved. Download its raw record from the Admin Panel.',{status:409,headers:noStore});
    if(typeof selection.revision!=='string' || !/^[a-f0-9]{64}$/.test(selection.revision))return new Response('Load the latest priority record before saving or deleting.',{status:428,headers:noStore});
    const conflict=()=>new Response('Priority changed since it was loaded. Nothing was changed by this action. Load the latest record and review before trying again.',{status:409,headers:noStore});
    if(selection.revision!==await priorityRevision('record:'+mode,previous?[previous]:[]))return conflict();
    if(request.method==='DELETE') {
      if(previous) {
        const result=await storageOperation('priority-preview','write',()=>env.DB.prepare('DELETE FROM priority_preview WHERE mode = ? AND draft_json = ? AND updated_at = ?').bind(mode,previous.draft_json,previous.updated_at).run());
        if(result.meta.changes!==1)return conflict();
      }
      return Response.json({removed:mode},{headers:noStore});
    }
    const previousTime=Date.parse(previous?.updated_at);
    const next={mode,draft_json:JSON.stringify(draft),updated_at:new Date(Math.max(Date.now(),Number.isFinite(previousTime)?previousTime+1:0)).toISOString()};
    const result=previous
      ? await storageOperation('priority-preview','write',()=>env.DB.prepare('UPDATE priority_preview SET draft_json = ?, updated_at = ? WHERE mode = ? AND draft_json = ? AND updated_at = ?').bind(next.draft_json,next.updated_at,mode,previous.draft_json,previous.updated_at).run())
      : await storageOperation('priority-preview','write',()=>env.DB.prepare('INSERT INTO priority_preview (mode, draft_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(mode) DO NOTHING').bind(mode,next.draft_json,next.updated_at).run());
    if(result.meta.changes!==1)return conflict();
    return Response.json({saved:mode,revision:await priorityRevision('record:'+mode,[next])},{headers:noStore});
  } catch { return new Response('Priority preview storage failed. Try again later.', { status: 503 }); }
}
async function trackerSkills(request, env) {
  if (request.method !== 'GET') return new Response('Method not allowed', {status:405});
  try {
    const job=new URL(request.url).searchParams.get('job') || '호영';
    if(!['호영','렌'].includes(job))return new Response('Choose Hoyoung or Ren',{status:400,headers:noStore});
    const row=await storageOperation('tracker-catalogue','read',()=>env.DB.prepare('SELECT review_json FROM admin_skills WHERE job = ?').bind(job).first());
    const review=readStoredSkills(row,'tracker-catalogue');
    if(job==='렌') {
      const rows=await storageOperation('tracker-catalogue','read',()=>env.DB.prepare('SELECT mode, draft_json FROM priority_preview').all());
      const drafts={},counts={json:0,shape:0,validation:0};for(const source of rows.results || []){try{const draft=validateDraft(JSON.parse(source.draft_json));if(draft.job==='렌')drafts[draft.mode]=draft;}catch(error){counts[invalidCategory(error)]++;}}
      for(const [category,count] of Object.entries(counts))if(count)serverDiagnostic('tracker-catalogue','invalid_record','priorities_read',category,count);
      return Response.json(renCatalogueFromDrafts(drafts,review),{headers:noStore});
    }
    return Response.json(trackerCatalogue(review), {headers:noStore});
  } catch { return new Response('Skills storage unavailable', {status:503,headers:noStore}); }
}
// Temporary service authorisation is limited to backing up and removing exact
// saved priority rows. It never grants access to upstream requests or owner edits.
async function adminMaintenance(request, env) {
  const token=env?.ADMIN_MAINTENANCE_TOKEN;
  if (!isAdmin(request,env) && !(typeof token==='string' && token.length>=32 && request.headers.get('Authorization')===`Bearer ${token}`)) return new Response('Admin access required',{status:403});
  if (!['GET','POST'].includes(request.method)) return new Response('Method not allowed',{status:405});
  try {
    const priorities=(await storageOperation('admin-maintenance','read',()=>env.DB.prepare('SELECT mode, draft_json, updated_at FROM priority_preview ORDER BY mode').all())).results || [];
    const skills=(await storageOperation('admin-maintenance','read',()=>env.DB.prepare('SELECT job, review_json, updated_at FROM admin_skills ORDER BY job').all())).results || [];
    const snapshot={schema:1,type:'hexa-tracker-backup',priorities,skills};
    if (request.method==='GET') return Response.json({...snapshot,createdAt:new Date().toISOString()},{headers:noStore});
    const body=await request.text();
    if(body.length>2000000) return new Response('Payload too large',{status:413});
    const value=JSON.parse(body);
    if(value.confirm!=='clear-backed-up-priorities' || JSON.stringify(value.priorities)!==JSON.stringify(priorities)) return new Response('Backup does not match current saved priorities',{status:409});
    // Exact row predicates preserve any edit that arrives after the snapshot read.
    const deleted=priorities.length ? await storageOperation('admin-maintenance','batch',()=>env.DB.batch(priorities.map(row=>env.DB.prepare('DELETE FROM priority_preview WHERE mode = ? AND draft_json = ? AND updated_at = ?').bind(row.mode,row.draft_json,row.updated_at)))) : [];
    const remaining=(await storageOperation('admin-maintenance','read',()=>env.DB.prepare('SELECT mode FROM priority_preview').all())).results || [];
    return Response.json({removed:deleted.reduce((sum,result)=>sum+result.meta.changes,0),remaining:remaining.map(row=>row.mode)},{headers:noStore});
  } catch { return new Response('Backup or reset failed',{status:503,headers:noStore}); }
}
async function skillsRevision(job, row) {
  const bytes = new TextEncoder().encode(JSON.stringify([job, row?.review_json ?? null, row?.updated_at ?? null]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
}
function priorityTargets(drafts,id) {
  return Object.values(drafts).filter(draft=>draft.pairId===id || (!draft.pairId && draft.mode===id));
}
function priorityRows(storedRows,targets) {
  const modes=new Set(targets.map(draft=>draft.mode));
  return storedRows.filter(row=>modes.has(row.mode)).sort((a,b)=>a.mode<b.mode?-1:a.mode>b.mode?1:0);
}
async function priorityRevision(id,rows) {
  const bytes=new TextEncoder().encode(JSON.stringify([id,rows.map(row=>[row.mode,row.draft_json,row.updated_at])]));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function priorityGuard(id,rows) {
  // Include group membership and every raw row in one atomic SQL predicate.
  // CASE avoids parsing malformed JSON from unrelated preserved records.
  const scope="p.mode = ? OR CASE WHEN json_valid(p.draft_json) THEN json_extract(p.draft_json,'$.pairId') = ? ELSE 0 END";
  const sql=`(SELECT count(*) FROM priority_preview p WHERE (${scope})) = ? AND (SELECT count(*) FROM priority_preview p WHERE EXISTS (SELECT 1 FROM json_each(?) e WHERE json_extract(e.value,'$.mode') = p.mode AND json_extract(e.value,'$.draft_json') = p.draft_json AND json_extract(e.value,'$.updated_at') = p.updated_at)) = ?`;
  return {sql,values:[id,id,rows.length,JSON.stringify(rows),rows.length]};
}
async function adminPanel(request, env) {
  if (!isAdmin(request, env)) return new Response('Admin access required', {status:403,headers:noStore});
  if (!env?.DB) {serverDiagnostic('admin-panel','storage_failure','binding','missing');return new Response('Admin storage is unavailable', {status:503,headers:noStore});}
  try {
    const rows = await storageOperation('admin-panel','read',()=>env.DB.prepare('SELECT mode, draft_json, updated_at FROM priority_preview').all());
    const storedRows = rows.results || [];
    const occupied = new Set(storedRows.map(row => row.mode));
    const {drafts, invalidRecords} = readPriorityRows(storedRows,'admin-panel');
    if (request.method === 'GET') {
      const record = new URL(request.url).searchParams.get('record');
      if (record !== null) {
        const row = storedRows.find(row => row.mode === record);
        if (!row || !invalidRecords.some(item => item.mode === record)) return new Response('Damaged priority not found', {status:404,headers:noStore});
        return Response.json({schema:1,type:'hexa-invalid-priority-record',mode:row.mode,draft_json:row.draft_json}, {headers:noStore});
      }
      const job=new URL(request.url).searchParams.get('job') || '호영';
      if(!['호영','렌'].includes(job))return new Response('Choose Hoyoung or Ren',{status:400,headers:noStore});
      const review = await storageOperation('admin-panel','read',()=>env.DB.prepare('SELECT review_json, updated_at FROM admin_skills WHERE job = ?').bind(job).first());
      const scoped=Object.fromEntries(Object.entries(drafts).filter(([,draft])=>(draft.job || '호영')===job));
      const ids=[...new Set(Object.values(scoped).map(draft=>draft.pairId || draft.mode))];
      const priorityRevisions=Object.fromEntries(await Promise.all(ids.map(async id=>[id,await priorityRevision(id,priorityRows(storedRows,priorityTargets(drafts,id)))])));
      return Response.json({drafts:scoped, priorityRevisions, invalidRecords, skills:review ? validateSkills(readStoredSkills(review,'admin-panel')) : null, skillsRevision:await skillsRevision(job,review)}, {headers:noStore});
    }
    if (!['PUT','POST','PATCH','DELETE'].includes(request.method)) return new Response('Method not allowed', {status:405});
    if (Number(request.headers.get('content-length')) > 250000) return new Response('Payload too large', {status:413});
    const text = await request.text();
    if (text.length > 250000) return new Response('Payload too large', {status:413});
    let value;
    try { value = JSON.parse(text); } catch { return new Response('Invalid JSON', {status:400}); }
    let changes, targets, expectedRows;
    const conflict=()=>new Response('Priority changed in another tab. Nothing was changed by this action. Load latest priorities and review before trying again.',{status:409,headers:noStore});
    try {
      if (request.method === 'PUT') {
        let review = validateSkills(value);
        if(typeof value.skillsRevision!=='string' || !/^[a-f0-9]{64}$/.test(value.skillsRevision)) return new Response('Load the latest skills before saving. Your edits have not been saved.',{status:428,headers:noStore});
        const conflict=()=>new Response('Skills changed in another tab. Your edits are still here. Load latest skills to review the saved version.',{status:409,headers:noStore});
        const previous=await storageOperation('admin-panel','read',()=>env.DB.prepare('SELECT review_json, updated_at FROM admin_skills WHERE job = ?').bind(review.job).first());
        if(value.skillsRevision!==await skillsRevision(review.job,previous))return conflict();
        // Older clients may omit the new optional field. Only explicit text,
        // including an empty string, may replace a saved explanation.
        const savedRows = new Map((previous ? readStoredSkills(previous,'admin-panel').rows : []).map(row=>[row.coreId,row]));
        review = validateSkills({...review,rows:review.rows.map(row=>Object.hasOwn(row,'helperExplanation') ? row : {...row,
          ...(Object.hasOwn(savedRows.get(row.coreId) || {},'helperExplanation') ? {helperExplanation:savedRows.get(row.coreId).helperExplanation} : {})})});
        const previousTime=Date.parse(previous?.updated_at);
        const next={review_json:JSON.stringify(review),updated_at:new Date(Math.max(Date.now(),Number.isFinite(previousTime)?previousTime+1:0)).toISOString()};
        // The SQL predicate also rejects an edit arriving after the revision read.
        const result=previous
          ? await storageOperation('admin-panel','write',()=>env.DB.prepare('UPDATE admin_skills SET review_json = ?, updated_at = ? WHERE job = ? AND review_json = ? AND updated_at = ?').bind(next.review_json,next.updated_at,review.job,previous.review_json,previous.updated_at).run())
          : await storageOperation('admin-panel','write',()=>env.DB.prepare('INSERT INTO admin_skills (job, review_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(job) DO NOTHING').bind(review.job,next.review_json,next.updated_at).run());
        if(result.meta.changes!==1)return conflict();
        return Response.json({saved:true,skillsRevision:await skillsRevision(review.job,next)}, {headers:noStore});
      }
      if (request.method === 'POST' && value.restoreSnapshot) {
        const backup=value.restoreSnapshot;
        if (backup.schema!==1 || backup.type!=='hexa-tracker-backup' || !Array.isArray(backup.priorities) || backup.priorities.length>100 || !Array.isArray(backup.skills) || backup.skills.length>10) throw new Error('Invalid tracker backup');
        const restored=backup.priorities.map(row=>{const draft=validateDraft(JSON.parse(row.draft_json));if(draft.mode!==row.mode || occupied.has(row.mode)) throw new Error('Backup priority already exists or has an invalid identity');return {...draft,enabled:false};});
        if(new Set(restored.map(draft=>draft.mode)).size!==restored.length) throw new Error('Duplicate backup priority');
        const reviews=backup.skills.map(row=>{const review=validateSkills(JSON.parse(row.review_json));if(review.job!==row.job)throw new Error('Invalid backup skill identity');return review;});
        if(new Set(reviews.map(review=>review.job)).size!==reviews.length)throw new Error('Duplicate backup skills');
        for(const review of reviews)if(await storageOperation('admin-panel','read',()=>env.DB.prepare('SELECT review_json FROM admin_skills WHERE job = ?').bind(review.job).first()))throw new Error('Saved skills already exist. Restore into an empty catalogue.');
        try {
          if(restored.length || reviews.length)await storageOperation('admin-panel','batch',()=>env.DB.batch([...restored.map(draft=>env.DB.prepare('INSERT INTO priority_preview (mode, draft_json, updated_at) VALUES (?, ?, ?)').bind(draft.mode,JSON.stringify(draft),new Date().toISOString())),...reviews.map(review=>env.DB.prepare('INSERT INTO admin_skills (job, review_json, updated_at) VALUES (?, ?, ?)').bind(review.job,JSON.stringify(review),new Date().toISOString()))]),true);
        }catch(error){
          if(/UNIQUE constraint failed: (?:priority_preview.mode|admin_skills.job)/.test(String(error.message)))return new Response('Saved records changed during restore. Nothing from this backup was restored. Load latest data and review before trying again.',{status:409,headers:noStore});
          return new Response('Restore storage failed. Nothing from this backup was restored. Try again later.',{status:503,headers:noStore});
        }
        return Response.json({restored:restored.length},{headers:noStore});
      }
      if (request.method === 'POST') {
        changes = value.legacyDraft ? [validateDraft(value.legacyDraft)] : validatePair(value);
        if (changes.some(draft => occupied.has(draft.mode))) throw new Error('This priority pair already exists, including any preserved damaged records');
      } else {
        if(typeof value?.id!=='string' || !/^[a-z0-9_]+$/.test(value.id))throw new Error('Invalid priority ID');
        targets = priorityTargets(drafts,value.id);
        if (!targets.length) {
          if(typeof value.priorityRevision==='string')return conflict();
          throw new Error('Saved priority not found');
        }
        if(typeof value.priorityRevision!=='string' || !/^[a-f0-9]{64}$/.test(value.priorityRevision))return new Response('Load latest priorities before changing a saved priority.',{status:428,headers:noStore});
        expectedRows=priorityRows(storedRows,targets);
        if(value.priorityRevision!==await priorityRevision(value.id,expectedRows))return conflict();
        if (request.method === 'DELETE') {
          changes=[];
        } else {
          if ((value.name !== undefined && (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120)) || (value.enabled !== undefined && typeof value.enabled !== 'boolean')) throw new Error('Invalid priority changes');
          changes = targets.map(draft => validateDraft({...draft, ...(value.enabled === undefined ? {} : {enabled:value.enabled}), ...(value.name === undefined ? {} : draft.pairId ? {pairName:value.name.trim(), name:value.name.trim() + ' | ' + (draft.sourceMode.endsWith('_heroic') ? 'Heroic' : 'Interactive')} : {name:value.name.trim()})}));
        }
      }
      for(const job of ['호영','렌']) {
        const scoped=changes.filter(draft=>(draft.job || '호영')===job);if(!scoped.length)continue;
        const review=await storageOperation('admin-panel','read',()=>env.DB.prepare('SELECT review_json FROM admin_skills WHERE job = ?').bind(job).first());
        requireOrderSkills(scoped,readStoredSkills(review,'admin-panel'));
      }
      if (changes.some(draft => draft.newNodes.length)) throw new Error('New skills still need tracker support before saving a priority');
    } catch (error) { if(error instanceof ServerDataFailure)throw error;return new Response(error.message, {status:400,headers:noStore}); }
    if(request.method==='DELETE') {
      const guard=priorityGuard(value.id,expectedRows);
      const result=await storageOperation('admin-panel','write',()=>env.DB.prepare(`DELETE FROM priority_preview WHERE mode IN (${targets.map(()=>'?').join(',')}) AND ${guard.sql}`).bind(...targets.map(draft=>draft.mode),...guard.values).run());
      if(result.meta.changes!==targets.length)return conflict();
      return Response.json({removed:value.id}, {headers:noStore});
    }
    if(request.method==='PATCH') {
      const guard=priorityGuard(value.id,expectedRows);
      const previousTime=Math.max(...expectedRows.map(row=>Date.parse(row.updated_at)).filter(Number.isFinite),0);
      const updatedAt=new Date(Math.max(Date.now(),previousTime+1)).toISOString();
      const result=await storageOperation('admin-panel','write',()=>env.DB.prepare(`UPDATE priority_preview SET draft_json = CASE mode ${changes.map(()=> 'WHEN ? THEN ?').join(' ')} END, updated_at = ? WHERE mode IN (${changes.map(()=>'?').join(',')}) AND ${guard.sql}`).bind(...changes.flatMap(draft=>[draft.mode,JSON.stringify(draft)]),updatedAt,...changes.map(draft=>draft.mode),...guard.values).run());
      if(result.meta.changes!==changes.length)return conflict();
    } else {
      // A single INSERT commits both variants or rolls back on any ID collision.
      // Never upsert a new pair over a record inserted after the initial read.
      try {
        await storageOperation('admin-panel','write',()=>env.DB.prepare(`INSERT INTO priority_preview (mode, draft_json, updated_at) VALUES ${changes.map(()=>'(?, ?, ?)').join(',')}`).bind(...changes.flatMap(draft=>[draft.mode,JSON.stringify(draft),new Date().toISOString()])).run(),true);
      }catch(error){if(/UNIQUE constraint failed: priority_preview.mode/.test(String(error.message)))return conflict();throw error;}
    }
    return Response.json({saved:changes.map(draft=>draft.mode)}, {headers:noStore});
  } catch { return new Response('Admin storage failed. Your edits have not been discarded. Try again later.', {status:503,headers:noStore}); }
}

// Each Scouter request starts from the job's fixed Origin baseline, regardless of
// the account levels in the saved template. Add other jobs' Origin IDs here only
// when their request schema has been verified.
const originByClass = { '호영': 'skillCore1' };
const coreKey = /^(?:skillCore|masteryCore|reinCore|generalCore)\d+$/;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
function resetHexa(hexa, origin) {
  if (!record(hexa) || !record(hexa.hexaSkill) || !record(hexa.hexaSkill_general) ||
      !Object.hasOwn(hexa, 'hexaStat') || !Object.hasOwn(hexa, 'hexaStat_opened') ||
      !Object.hasOwn(hexa, origin) || !Object.hasOwn(hexa.hexaSkill, origin) ||
      !Number.isInteger(hexa.hexaStat) || hexa.hexaStat < 0 || typeof hexa.hexaStat_opened !== 'boolean') return false;
  hexa.hexaStat = 0;
  hexa.hexaStat_opened = false;
  for (const [key, value] of Object.entries(hexa)) {
    if (coreKey.test(key)) {
      if (!/^(?:0|[1-9]\d*)$/.test(String(value))) return false;
      hexa[key] = key === origin ? '1' : '0';
    }
  }
  for (const group of [hexa.hexaSkill, hexa.hexaSkill_general]) {
    for (const [key, value] of Object.entries(group)) {
      if (!coreKey.test(key) || !Number.isInteger(value) || value < 0) return false;
      group[key] = key === origin ? 1 : 0;
    }
  }
  return hexa.hexaStat === 0 && hexa.hexaStat_opened === false &&
    hexa[origin] === '1' && hexa.hexaSkill[origin] === 1 &&
    Object.entries(hexa).every(([key, value]) => !coreKey.test(key) || value === (key === origin ? '1' : '0')) &&
    [hexa.hexaSkill, hexa.hexaSkill_general].every(group =>
      Object.entries(group).every(([key, value]) => value === (key === origin ? 1 : 0)));
}

export function prepareScouterRequest(mode, env) {
  const kms = mode.startsWith('taotie_');
  const part1 = kms ? env?.MAPLE_SCOUTER_KMS_REQUEST_PART_1 : env?.MAPLE_SCOUTER_REQUEST_PART_1;
  const part2 = kms ? env?.MAPLE_SCOUTER_KMS_REQUEST_PART_2 : env?.MAPLE_SCOUTER_REQUEST_PART_2;
  if (!part1 || !part2) throw new Error('Maple Scouter request is not configured for this update');
  let payload;
  try { payload = JSON.parse(part1 + part2); }
  catch { throw new Error('Configured Maple Scouter request is invalid JSON'); }
  if (payload?.myHexa?.character_class !== '호영' || payload?.userStat?.stat?.myClass !== '호영' || payload?.userStat?.isGMS !== !kms) throw new Error('Configured Hoyoung request has the wrong class or region');
  if (!resetHexa(payload.myHexa, 'skillCore1') || !resetHexa(payload.userStat?.hexa, 'skillCore1')) throw new Error('Configured Hoyoung request cannot be reset to Origin 1, all other skills 0 and unopened HEXA Stats');
  payload.sole = mode.endsWith('_interactive');
  return payload;
}

// Values are allowlisted, not copied wholesale from a secret template. Unknown
// fields retain their paths/types but never their private strings or statistics.
export function inspectScouterRequest(payload) {
  const fields = [], issues = [];
  // Observed in both live Hoyoung templates on 30 September. This is a schema
  // fingerprint, not a claim that the inventories must mirror each other.
  const observed = {
    top: ['skillCore1','skillCore2','skillCore3','skillCore4','skillCore5','skillCore6','masteryCore1','masteryCore2','masteryCore3','masteryCore4','reinCore1','reinCore2','reinCore3','reinCore4','generalCore2','generalCore3','generalCore4'],
    hexaSkill: ['skillCore1','skillCore2','skillCore3','masteryCore1','masteryCore2','masteryCore3','masteryCore4','reinCore1','reinCore2','reinCore3','reinCore4'],
    hexaSkill_general: ['generalCore1','generalCore2','generalCore3']
  };
  const type = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  function walk(value, path = '') {
    const key = path.split('.').at(-1);
    const inHexa = /^(myHexa|userStat\.hexa)(\.|$)/.test(path);
    const knownLevel = inHexa && coreKey.test(key);
    if (knownLevel) {
      const relative = path.replace(/^(myHexa|userStat\.hexa)\./, '').split('.');
      const group = relative.length === 1 ? 'top' : relative.length === 2 ? relative[0] : '';
      if (!observed[group]?.includes(key)) issues.push({path, reason:'Unrecognised core or level location outside the observed Hoyoung schema'});
    }
    const knownStat = inHexa && ['hexaStat', 'hexaStat_opened'].includes(key);
    const row = { path: path || '$', type: type(value) };
    if ((knownLevel || knownStat) && ['number', 'boolean'].includes(typeof value)) row.value = value;
    else if (knownLevel && /^[0-9]+$/.test(value)) row.value = value;
    else if (['sole','userStat.isGMS'].includes(path)) row.value = value;
    else if (['myHexa.character_class','userStat.hexa.character_class','userStat.stat.myClass'].includes(path)) row.value = value === '호영' ? '호영' : '[redacted]';
    else if (typeof value !== 'object' || value === null) row.value = '[redacted]';
    fields.push(row);
    if (!knownLevel && !knownStat && !['hexaSkill','hexaSkill_general','myHexa','userStat.hexa'].includes(key) &&
        ((inHexa && /core|stat|level|opened|unlock/i.test(key)) || (!inHexa && /hexa|core|skill.*level/i.test(key)))) issues.push({ path, reason: 'Unrecognised HEXA or level field; value redacted, requires schema review' });
    if (value && typeof value === 'object') for (const [child, item] of Object.entries(value)) walk(item, Array.isArray(value) ? `${path}[${child}]` : path ? `${path}.${child}` : child);
  }
  walk(payload);
  const copies = ['myHexa','userStat.hexa'].map(path => {
    const h = path === 'myHexa' ? payload.myHexa : payload.userStat?.hexa;
    for (const [group, keys] of Object.entries(observed)) for (const key of keys) {
      if (!Object.hasOwn(group === 'top' ? h || {} : h?.[group] || {}, key)) issues.push({path: `${path}.${group === 'top' ? '' : group + '.'}${key}`, reason:'Missing core from the observed Hoyoung schema'});
    }
    const cores = Object.keys(h || {}).filter(k => coreKey.test(k)).sort();
    for (const key of cores) {
      const group = key.startsWith('generalCore') ? 'hexaSkill_general' : 'hexaSkill';
      if (!Object.hasOwn(h[group] || {}, key)) issues.push({ path: `${path}.${group}.${key}`, reason: 'Missing matching nested core' });
    }
    for (const group of ['hexaSkill','hexaSkill_general']) for (const key of Object.keys(h?.[group] || {})) if (!cores.includes(key)) issues.push({path:`${path}.${key}`,reason:'Missing matching top-level core'});
    return { path, cores, origin: h?.skillCore1 === '1' && h?.hexaSkill?.skillCore1 === 1, presentSkillsReset: cores.every(k => h[k] === (k === 'skillCore1' ? '1' : '0')), scalarStatReset: h?.hexaStat === 0 && h?.hexaStat_opened === false };
  });
  if (JSON.stringify(copies[0].cores) !== JSON.stringify(copies[1].cores)) issues.push({ path:'userStat.hexa', reason:'Core inventories differ between copies' });
  // Until the real schema is reviewed, a single scalar cannot prove Stats I-III.
  issues.push({ path:'myHexa.hexaStat', reason:'Scalar Stat fields do not independently prove all three Stats are zero and unopened; schema confirmation required' });
  return { fields, copies, issues, validatedForClassSubstitution: false, upstreamCalled: false, persisted: false };
}

async function requestDiagnostic(request, env) {
  const serviceToken = env?.SCOUTER_DIAGNOSTIC_TOKEN;
  const ownerService = typeof serviceToken === 'string' && serviceToken.length >= 32 && request.headers.get('Authorization') === `Bearer ${serviceToken}`;
  if (!isAdmin(request, env) && !ownerService) return new Response('Admin access required', {status:403, headers:noStore});
  if (request.method !== 'GET') return new Response('Method not allowed', {status:405, headers:noStore});
  const requests = await Promise.all(['lotus_heroic','lotus_interactive','taotie_heroic','taotie_interactive'].map(async mode => {
    try {
      const payload = prepareScouterRequest(mode, env);
      return { mode, ...inspectScouterRequest(payload), requestContext:await scouterRequestContext(payload) };
    }
    catch (error) { return {mode, error:error.message, validatedForClassSubstitution:false}; }
  }));
  return Response.json({requests}, {headers:noStore});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ren-capture') {
      if(!isAdmin(request,env))return new Response('Admin access required',{status:403,headers:noStore});
      if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:noStore});
      const body=await request.text();
      if(body.length>1000)return new Response('Payload too large',{status:413});
      let selection;try{selection=JSON.parse(body);}catch{return new Response('Invalid JSON',{status:400});}
      if(!['GMS','KMS'].includes(selection?.region)||Object.keys(selection).length!==1)return new Response('Choose GMS or KMS for Ren capture review',{status:400,headers:noStore});
      if(!env.MAPLE_SCOUTER_API_KEY)return new Response('Ren request is not configured',{status:503,headers:noStore});
      try{return Response.json(await cachedRenPreview(env.MAPLE_SCOUTER_API_KEY,selection.region),{headers:noStore});}
      catch{return new Response('Ren capture failed. Saved data is unchanged.',{status:502,headers:noStore});}
    }
    if (url.pathname === '/api/tracker-catalogue') return trackerSkills(request, env);
    if (url.pathname === '/api/admin-maintenance') return adminMaintenance(request, env);
    if (url.pathname === '/api/admin-panel') return adminPanel(request, env);
    if (url.pathname === '/api/scouter-catalogue') {
      if (!isAdmin(request, env)) return new Response('Admin access required', {status:403, headers:noStore});
      if (request.method !== 'GET') return new Response('Method not allowed', {status:405, headers:noStore});
      const keys = ['job','region','world'];
      if ([...url.searchParams.keys()].some(key => !keys.includes(key)) || keys.some(key => url.searchParams.getAll(key).length !== 1)) return new Response('Choose one job, region and world', {status:400, headers:noStore});
      const args = keys.map(key => url.searchParams.get(key));
      try { catalogueSelection(...args); }
      catch { return new Response('Choose a Scouter job name, GMS/KMS and Heroic/Interactive', {status:400, headers:noStore}); }
      try { return Response.json(await acquireScouterCatalogue(...args), {headers:noStore}); }
      catch { return new Response('Scouter source acquisition failed. Review the current source schema or try later.', {status:502, headers:noStore}); }
    }
    if (url.pathname === '/api/scouter-request-diagnostic') return requestDiagnostic(request, env);
    if (url.pathname === '/api/priority-preview') return priorityPreview(request, env);
    if (['/priority-review.html', '/scouter-request-diagnostic.html'].includes(url.pathname) && !isAdmin(request, env)) {
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Panel sign-in</title><main style="font:1rem system-ui;max-width:32rem;margin:12vh auto;padding:1.5rem"><h1>Admin Panel</h1><p>Sign in as the site owner to edit priorities.</p><p><a href="/signin-with-chatgpt?return_to=%2Fpriority-review.html">Continue with ChatGPT</a></p><p><a href="/">Back to tracker</a></p></main></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/hexa-order') {
      if (!isAdmin(request, env)) return new Response('Admin access required', {status:403,headers:noStore});
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (Number(request.headers.get('content-length')) > 1_000) return new Response('Payload too large', { status: 413 });
      let selection, payload;
      try {
        const body = await request.text();
        if (body.length > 1_000) return new Response('Payload too large', { status: 413 });
        selection = JSON.parse(body);
      } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!['lotus_heroic', 'lotus_interactive', 'taotie_heroic', 'taotie_interactive'].includes(selection?.mode)) return new Response('Supported Hoyoung mode required', { status: 400 });
      if (!env?.MAPLE_SCOUTER_API_KEY) return new Response('Maple Scouter request is not configured for this update', { status: 503 });
      try { payload = prepareScouterRequest(selection.mode, env); }
      catch (error) { return new Response(error.message, { status: 503 }); }
      try {
        const upstream = await fetch(scouterUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'api-key': env.MAPLE_SCOUTER_API_KEY,
            'Origin': 'https://maplescouter.com',
            'Referer': 'https://maplescouter.com/'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25_000)
        });
        if (!upstream.ok) return new Response([429, 430].includes(upstream.status)
          ? `Maple Scouter returned ${upstream.status}. Wait a few minutes before checking again.`
          : `Maple Scouter returned ${upstream.status}`, { status: 502 });
        const result = await upstream.json();
        if (!Array.isArray(result?.class_hexa) || !result.class_hexa.length) return new Response('Maple Scouter returned an unexpected order', { status: 502 });
        return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
      } catch { return new Response('Maple Scouter could not be reached', { status: 502 }); }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (!Object.hasOwn(ASSETS, path)) return new Response('Not found', { status: 404 });
    const ext = path.slice(path.lastIndexOf('.'));
    if (ext === '.mp3') {
      const bytes = Uint8Array.from(atob(ASSETS[path]), char => char.charCodeAt(0));
      const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=60', 'Accept-Ranges': 'bytes', 'Content-Length': String(bytes.length) };
      if (request.method === 'HEAD') return new Response(null, { headers });
      const range = request.headers.get('range');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        let start, end;
        if (match && (match[1] || match[2])) {
          start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
          end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= bytes.length || end < start || (!match[1] && Number(match[2]) === 0)) {
          return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}`, 'Accept-Ranges': 'bytes' } });
        }
        headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
        headers['Content-Length'] = String(end - start + 1);
        return new Response(bytes.slice(start, end + 1), { status: 206, headers });
      }
      return new Response(bytes, { headers });
    }
    const body = ext === '.png' && request.method !== 'HEAD' ? Uint8Array.from(atob(ASSETS[path]), char => char.charCodeAt(0)) : ASSETS[path];
    return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': ['.html', '.js', '.css'].includes(ext) ? 'no-store' : 'public, max-age=60' } });
  }
};

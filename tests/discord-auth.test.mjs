import assert from 'node:assert/strict';
import worker from '../worker.js';
import {adminAllowed,discordRoute,decorateAdmin} from '../discord-auth.js';

const origin='https://tracker.pages.dev',owner='123456789012345678',visitor='234567890123456789';
const env={ADMIN_AUTH_MODE:'discord',ADMIN_AUTH_ORIGIN:origin,DISCORD_CLIENT_ID:'345678901234567890',DISCORD_ADMIN_ID:owner,
  DISCORD_CLIENT_SECRET:'isolated-discord-secret-value',ADMIN_SESSION_SECRET:'isolated-random-session-secret-more-than-43-chars',ADMIN_EMAIL:'legacy@example.test'};
const originalFetch=globalThis.fetch,originalNow=Date.now,originalTimeout=globalThis.setTimeout,originalError=console.error;
let diagnostics=[];console.error=(...args)=>diagnostics.push(args);
let calls=[],userId=owner,fixtureFailure=null,fixtureRedirect=null,storage=0;
env.DB={prepare(){storage++;throw Error('Denied request reached storage');}};
const request=(path,options={},config=env)=>worker.fetch(new Request(origin+path,options),config);
const firstCookie=response=>response.headers.getSetCookie().map(value=>value.split(';')[0]);
async function begin(config=env){const start=await request('/auth/discord/login',{},config);assert.equal(start.status,302);
  const destination=new URL(start.headers.get('Location'));assert.equal(destination.origin,'https://discord.com');assert.equal(destination.searchParams.get('scope'),'identify');assert.equal(destination.searchParams.get('redirect_uri'),origin+'/auth/discord/callback');
  assert.equal(start.headers.get('Cache-Control'),'no-store');assert.equal(start.headers.get('Referrer-Policy'),'no-referrer');assert.match(start.headers.get('Set-Cookie'),/Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  return {state:destination.searchParams.get('state'),cookie:firstCookie(start)[0]};}
async function callback(flow,query='',options={}){return request('/auth/discord/callback?state='+flow.state+'&code=isolated-code'+query,{headers:{Cookie:flow.cookie},...options});}
try {
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});assert.notEqual(options.redirect,'error','Cloudflare runtime refuses error redirect mode');assert.equal(options.redirect,'manual');assert.equal(options.headers['User-Agent'],'DiscordBot (https://github.com/soushityphon/hexa-matrix-tracker, 1.0)');assert(options.signal instanceof AbortSignal);
    if(fixtureRedirect && (fixtureRedirect.stage==='token'?url.endsWith('/oauth2/token'):url.endsWith('/users/@me')))return new Response(null,{status:fixtureRedirect.status,headers:{Location:'https://attacker.example/token-theft'}});
    if(fixtureFailure==='request')throw Error('private exception '+env.DISCORD_CLIENT_SECRET);
    if(fixtureFailure==='upstream')return new Response('private provider details',{status:500});
    if(fixtureFailure==='body')return new Response('x'.repeat(16385));
    if(fixtureFailure==='stall')return new Response(new ReadableStream({start(){}}));
    if(url.endsWith('/oauth2/token')){const body=new URLSearchParams(options.body);assert.equal(options.method,'POST');assert.equal(body.get('grant_type'),'authorization_code');assert.equal(body.get('client_secret'),env.DISCORD_CLIENT_SECRET);assert.equal(body.get('redirect_uri'),origin+'/auth/discord/callback');
      return Response.json({access_token:'isolated-token-never-in-cookie',refresh_token:'isolated-refresh-never-saved',token_type:'Bearer',scope:'identify'});}
    assert.equal(url,'https://discord.com/api/v10/users/@me');assert.equal(options.headers.Authorization,'Bearer isolated-token-never-in-cookie');return Response.json({id:userId,username:'ignored',email:'not-requested'});
  };
  const publicHeaders={'oai-authenticated-user-email':env.ADMIN_EMAIL};
  const paths=['/api/admin-panel','/api/admin-maintenance','/api/scouter-request-diagnostic','/api/scouter-catalogue','/api/hexa-order','/api/ren-capture','/api/priority-preview?record=lotus_heroic'];
  for(const path of paths)for(const method of path.startsWith('/api/priority-preview')?['GET','PUT','DELETE']:['GET','POST','PUT','PATCH','DELETE'])assert.equal((await request(path,{method,headers:publicHeaders})).status,403);
  assert.equal(storage,0);assert.equal(calls.length,0);
  const login=await (await request('/priority-review.html')).text();assert.match(login,/<h1>Admin Panel<\/h1>/);assert.match(login,/>Sign in<\/a>/);assert(!login.includes('Discord'));assert(!login.includes('Back to tracker')); 
  for(const name of ['DISCORD_CLIENT_ID','DISCORD_ADMIN_ID','DISCORD_CLIENT_SECRET','ADMIN_SESSION_SECRET','ADMIN_AUTH_ORIGIN']){
    const broken={...env};delete broken[name];assert.equal((await request('/auth/discord/login',{},broken)).status,503);assert.equal(await adminAllowed(new Request(origin+'/api/admin-panel',{headers:publicHeaders}),broken),false);
  }
  assert.equal(await adminAllowed(new Request(origin+'/api/admin-panel',{headers:publicHeaders}),{ADMIN_EMAIL:env.ADMIN_EMAIL}),false,'Pages never inherits Sites trust');
  assert.equal(await adminAllowed(new Request('https://tracker.workers.dev/api/admin-panel',{headers:publicHeaders}),{ADMIN_EMAIL:env.ADMIN_EMAIL,ADMIN_AUTH_MODE:'sites'}),false);
  assert.equal(await adminAllowed(new Request('https://isolated.example/api/admin-panel',{headers:publicHeaders}),{ADMIN_EMAIL:env.ADMIN_EMAIL,ADMIN_AUTH_MODE:'unknown'}),false);
  assert.equal((await discordRoute(new Request(origin+'/auth/discord/login'),{})).status,404,'Dormant routes do not activate in Sites mode');
  assert.equal((await worker.fetch(new Request('https://other.pages.dev/auth/discord/login'),env)).status,403);
  assert.equal((await request('/auth/discord/login?return_to=https://evil.example')).status,400);
  const flow=await begin();
  for(const cookie of ['',flow.cookie+'; '+flow.cookie,flow.cookie.slice(0,-1)+'!']){
    const rejected=await request('/auth/discord/callback?state='+flow.state+'&code=test',{headers:{Cookie:cookie}});assert.equal(rejected.status,400);assert.match(rejected.headers.get('Set-Cookie'),/Max-Age=0/);
  }
  assert.equal((await callback(flow,'&state=duplicate')).status,400);assert.equal((await callback(flow,'&code=duplicate')).status,400);
  assert.equal((await request('/auth/discord/callback?state=wrong&code=test',{headers:{Cookie:flow.cookie}})).status,400);
  assert.equal((await request('/auth/discord/callback?state='+flow.state+'&error=access_denied',{headers:{Cookie:flow.cookie}})).status,400);
  Date.now=()=>originalNow()+601000;assert.equal((await callback(flow)).status,400);Date.now=originalNow;assert.equal(calls.length,0,'Bad callbacks never contact Discord');
  userId=visitor;const denied=await callback(await begin());assert.equal(denied.status,403);assert(firstCookie(denied).every(c=>c.endsWith('=')),'Non-owner receives no session');
  userId=owner;const success=await callback(await begin());assert.equal(success.status,303);assert.equal(success.headers.get('Location'),'/priority-review.html');
  const sessionCookie=firstCookie(success).find(c=>c.startsWith('__Host-hexa-admin=') && !c.endsWith('='));assert(sessionCookie);assert.match(success.headers.getSetCookie().find(c=>c.startsWith('__Host-hexa-admin=')),/HttpOnly; Secure; SameSite=Lax; Max-Age=28800/);
  const cookiePayload=JSON.parse(Buffer.from(sessionCookie.split('=')[1].split('.')[0],'base64url'));assert.equal(cookiePayload.uid,owner);assert.equal(cookiePayload.exp-cookiePayload.iat,28800);assert(!JSON.stringify(cookiePayload).includes('isolated-token'));
  assert.equal((await request('/auth/discord/session',{headers:{Cookie:sessionCookie}})).status,200);assert.equal((await (await request('/auth/discord/session',{headers:{Cookie:sessionCookie}})).json()).discordUserId,owner);
  assert.equal(await adminAllowed(new Request(origin+'/api/admin-panel',{headers:{Cookie:sessionCookie}}),env),true);
  assert.equal((await request('/api/scouter-request-diagnostic',{headers:{Cookie:sessionCookie}})).status,200,'Verified owner reaches the actual Worker authorised branch');
  assert.match(decorateAdmin('<header>Admin</header>',env),/method="post" action="\/auth\/discord\/logout"/);
  assert.equal(decorateAdmin('<header>Admin</header>',{}),'<header>Admin</header>');
  for(const headers of [
    {Cookie:sessionCookie,Origin:'https://attacker.example','Content-Type':'application/json'},
    {Cookie:sessionCookie,'Content-Type':'application/json'},
    {Cookie:sessionCookie,Origin:origin,'Content-Type':'text/plain'}
  ])assert.equal((await request('/api/admin-panel',{method:'POST',headers})).status,403);
  assert.equal(await adminAllowed(new Request(origin+'/api/admin-panel',{method:'POST',headers:{Cookie:sessionCookie,Origin:origin,'Content-Type':'application/json'}}),env),true);
  for(const [cookie,config,url] of [
    [sessionCookie.slice(0,-1)+'!',env,origin],
    [sessionCookie+'; '+sessionCookie,env,origin],
    [sessionCookie,{...env,DISCORD_ADMIN_ID:visitor},origin],
    [sessionCookie,{...env,DISCORD_CLIENT_ID:visitor},origin],
    [sessionCookie,{...env,ADMIN_SESSION_SECRET:'rotated-isolated-session-secret-more-than-43-chars'},origin],
    [sessionCookie,env,'https://other.pages.dev']
  ])assert.equal(await adminAllowed(new Request(url+'/api/admin-panel',{headers:{Cookie:cookie}}),config),false);
  Date.now=()=>originalNow()+28801000;assert.equal(await adminAllowed(new Request(origin+'/api/admin-panel',{headers:{Cookie:sessionCookie}}),env),false);Date.now=()=>originalNow()-10000;assert.equal(await adminAllowed(new Request(origin+'/api/admin-panel',{headers:{Cookie:sessionCookie}}),env),false);Date.now=originalNow;
  assert.equal((await request('/auth/discord/logout')).status,405);assert.equal((await request('/auth/discord/logout',{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);
  const logout=await request('/auth/discord/logout',{method:'POST',headers:{Origin:origin,Cookie:sessionCookie}});assert.equal(logout.status,303);assert.equal(logout.headers.get('Location'),'/');assert(firstCookie(logout).every(c=>c.endsWith('=')));
  assert.equal(storage,0,'Authentication never modifies or reads Admin data');
  for(const failure of ['upstream','body','stall','request']){
    fixtureFailure=failure;if(failure==='stall')globalThis.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms===8000?15:ms,...args);
    const failed=await callback(await begin());assert.equal(failed.status,502);const text=await failed.text();assert(!text.includes('private provider details'));assert(!text.includes(env.DISCORD_CLIENT_SECRET));assert(!firstCookie(failed).some(c=>c.startsWith('__Host-hexa-admin=')));
    const last=diagnostics.at(-1);assert.equal(last[0],'Admin sign-in failed');assert.equal(last[1],'token');assert.equal(last[2],({upstream:'http',body:'body-limit',stall:'timeout',request:'request'})[failure]);assert.equal(last[3],failure==='upstream'?500:0);
    globalThis.setTimeout=originalTimeout;
  }
  fixtureFailure=null;
  for(const stage of ['token','identity'])for(const status of [301,302,303,307,308]){
    fixtureRedirect={stage,status};const callCount=calls.length;const rejected=await callback(await begin());assert.equal(rejected.status,502);assert(!firstCookie(rejected).some(c=>c.startsWith('__Host-hexa-admin=')));
    assert.equal(calls.length-callCount,stage==='token'?1:2,'Redirect refusal makes no follow-up request');assert(calls.every(c=>new URL(c.url).origin==='https://discord.com'));assert.deepEqual(diagnostics.at(-1),['Admin sign-in failed',stage,'redirect',status]);
  }
  fixtureRedirect=null;fixtureFailure='request';
  console.error=()=>{throw Error('isolated logging sink');};assert.equal((await callback(await begin())).status,502);console.error=(...args)=>diagnostics.push(args);
  assert(!JSON.stringify(diagnostics).includes(env.DISCORD_CLIENT_SECRET));assert(!JSON.stringify(diagnostics).includes('isolated-code'));assert(!JSON.stringify(diagnostics).includes('isolated-token'));assert(!JSON.stringify(diagnostics).includes('private'));
  assert.equal(storage,0);
}finally{globalThis.fetch=originalFetch;Date.now=originalNow;globalThis.setTimeout=originalTimeout;console.error=originalError;}
console.log('Discord Admin: owner-only server identity, bound/expired/tampered state and sessions, origin/CSRF checks, failure deadlines, logout and zero Admin data access pass; live setup is separate.');

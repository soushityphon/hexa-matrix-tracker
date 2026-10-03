// Server-only Discord Admin identity. No OAuth tokens, secrets or cloud saves in assets.
const STATE_COOKIE='__Host-hexa-discord-state',SESSION_COOKIE='__Host-hexa-admin';
const STATE_SECONDS=600,SESSION_SECONDS=28800;
const noStore={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const encoder=new TextEncoder();
const snowflake=value=>typeof value==='string' && /^[1-9]\d{16,19}$/.test(value);
const mode=env=>env?.ADMIN_AUTH_MODE ?? 'sites';
function configuration(env) {
  if(mode(env)!=='discord' || !snowflake(env.DISCORD_CLIENT_ID) || !snowflake(env.DISCORD_ADMIN_ID) ||
    typeof env.DISCORD_CLIENT_SECRET!=='string' || env.DISCORD_CLIENT_SECRET.length<16 ||
    typeof env.ADMIN_SESSION_SECRET!=='string' || env.ADMIN_SESSION_SECRET.length<43)return null;
  try {const origin=new URL(env.ADMIN_AUTH_ORIGIN);if(origin.protocol!=='https:' || origin.origin!==env.ADMIN_AUTH_ORIGIN)return null;
    return {origin:origin.origin,client:env.DISCORD_CLIENT_ID,owner:env.DISCORD_ADMIN_ID,secret:env.ADMIN_SESSION_SECRET,clientSecret:env.DISCORD_CLIENT_SECRET};
  }catch{return null;}
}
function encode(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(text){if(!/^[A-Za-z0-9_-]+$/.test(text))throw Error('Invalid encoding');return Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(config){return crypto.subtle.importKey('raw',encoder.encode(config.secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function sign(config,purpose,seconds,fields){const iat=Math.floor(Date.now()/1000),payload=encode(encoder.encode(JSON.stringify({v:1,purpose,origin:config.origin,client:config.client,iat,exp:iat+seconds,...fields})));
  return payload+'.'+encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(config),encoder.encode(payload))));}
function cookie(request,name){const values=(request.headers.get('Cookie') || '').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return values.length===1?values[0].slice(name.length+1):null;}
async function read(config,request,name,purpose,seconds){
  try {const token=cookie(request,name);if(!token || token.length>2048)return null;const parts=token.split('.');if(parts.length!==2)return null;
    const signature=decode(parts[1]);if(signature.length!==32 || !await crypto.subtle.verify('HMAC',await key(config),signature,encoder.encode(parts[0])))return null;
    const value=JSON.parse(new TextDecoder().decode(decode(parts[0]))),now=Math.floor(Date.now()/1000);
    return value.v===1 && value.purpose===purpose && value.origin===config.origin && value.client===config.client &&
      Number.isSafeInteger(value.iat) && Number.isSafeInteger(value.exp) && value.iat<=now && value.exp>now && value.exp>value.iat && value.exp-value.iat<=seconds?value:null;
  }catch{return null;}
}
const setCookie=(name,value,seconds)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
function response(body,status=200,extra={},cookies=[]){const headers=new Headers({...noStore,...extra});for(const c of cookies)headers.append('Set-Cookie',c);return new Response(body,{status,headers});}
const clearState=()=>setCookie(STATE_COOKIE,'',0),clearSession=()=>setCookie(SESSION_COOKIE,'',0);
async function session(request,config){if(new URL(request.url).origin!==config.origin)return null;const value=await read(config,request,SESSION_COOKIE,'session',SESSION_SECONDS);return value?.uid===config.owner?value:null;}
export async function adminAllowed(request,env) {
  if(mode(env)==='discord'){
    const config=configuration(env);if(!config || !await session(request,config))return false;
    // SameSite cookies alone do not protect against a sibling subdomain.
    return ['GET','HEAD'].includes(request.method) || request.headers.get('Origin')===config.origin && request.headers.get('Content-Type')?.split(';')[0].trim()==='application/json';
  }
  if(mode(env)!=='sites')return false;
  // Legacy Sites trust must never become Pages/Workers development-domain auth.
  const host=new URL(request.url).hostname;if(host.endsWith('.pages.dev') || host.endsWith('.workers.dev'))return false;
  return typeof env?.ADMIN_EMAIL==='string' && !!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();
}
export function adminSignIn(env){
  if(mode(env)!=='discord')return null;
  const ready=!!configuration(env);
  return response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Panel sign-in</title><main><h1>Admin Panel</h1><p>${ready?'Sign in with the authorised owner Discord account.':'Discord Admin sign-in is not configured yet.'}</p>${ready?'<p><a href="/auth/discord/login">Continue with Discord</a></p>':''}<p><a href="/">Back to tracker</a></p></main></html>`,ready?200:503,{'Content-Type':'text/html; charset=utf-8'});
}
export function decorateAdmin(html,env){return mode(env)==='discord'?html.replace('</header>','<form method="post" action="/auth/discord/logout"><button type="submit">Sign out of Admin</button></form></header>'):html;}
async function discordIdentity(config,code){
  const controller=new AbortController();let timer,reader;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reader?.cancel().catch(()=>{});reject(Error('Discord timeout'));},8000);});
  async function json(url,options){
    const result=await fetch(url,{...options,redirect:'error',signal:controller.signal});if(!result.ok)throw Error('Discord unavailable');
    if(Number(result.headers.get('Content-Length'))>16384)throw Error('Discord response too large');
    reader=result.body?.getReader();if(!reader)throw Error('Missing Discord response');let body='',size=0;const decoder=new TextDecoder();
    try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();throw Error('Discord response too large');}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();return JSON.parse(body);}
    finally{reader.releaseLock();reader=null;}
  }
  try {return await Promise.race([(async()=>{
    const token=await json('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.client,client_secret:config.clientSecret,grant_type:'authorization_code',code,redirect_uri:config.origin+'/auth/discord/callback'}).toString()});
    if(token.token_type?.toLowerCase()!=='bearer' || typeof token.access_token!=='string' || !token.access_token || token.access_token.length>4096 || !token.scope?.split(' ').includes('identify'))throw Error('Invalid Discord token');
    const user=await json('https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bearer '+token.access_token}});
    if(!snowflake(user.id) || user.bot || user.system)throw Error('Invalid Discord identity');return user.id;
  })(),timeout]);}finally{clearTimeout(timer);controller.abort();}
}
export async function discordRoute(request,env){
  const url=new URL(request.url),known=['/auth/discord/login','/auth/discord/callback','/auth/discord/session','/auth/discord/logout'];
  if(!known.includes(url.pathname))return null;
  if(mode(env)!=='discord')return response('Not found',404);
  const config=configuration(env);if(!config)return response('Discord Admin sign-in is not configured yet.',503);
  if(url.origin!==config.origin)return response('Admin access required',403);
  if(url.pathname==='/auth/discord/logout'){
    if(request.method!=='POST')return response('Method not allowed',405,{'Allow':'POST'});
    if(request.headers.get('Origin')!==config.origin)return response('Admin access required',403);
    return response(null,303,{Location:'/'},[clearSession(),clearState()]);
  }
  if(request.method!=='GET')return response('Method not allowed',405,{'Allow':'GET'});
  if(url.pathname==='/auth/discord/session'){
    const current=await session(request,config);return response(JSON.stringify(current?{authenticated:true,admin:true,discordUserId:current.uid}:{authenticated:false,admin:false}),200,{'Content-Type':'application/json'});
  }
  if(url.pathname==='/auth/discord/login'){
    if(url.search)return response('Invalid sign-in request',400);
    const nonce=crypto.randomUUID(),state=await sign(config,'state',STATE_SECONDS,{nonce});
    const target=new URL('https://discord.com/oauth2/authorize');target.search=new URLSearchParams({client_id:config.client,response_type:'code',scope:'identify',redirect_uri:config.origin+'/auth/discord/callback',state:nonce}).toString();
    return response(null,302,{Location:target.href},[setCookie(STATE_COOKIE,state,STATE_SECONDS)]);
  }
  const state=await read(config,request,STATE_COOKIE,'state',STATE_SECONDS),value=url.searchParams;
  const failure=(message,status)=>response(message,status,{},[clearState()]);
  if(!state || typeof state.nonce!=='string' || value.getAll('state').length!==1 || value.get('state')!==state.nonce)return failure('Sign-in expired or invalid. Start again from Admin.',400);
  if(value.has('error'))return failure('Discord sign-in was cancelled. Saved data is unchanged.',400);
  const code=value.get('code');if(value.getAll('code').length!==1 || !code || code.length>2048 || [...value.keys()].some(k=>!['state','code'].includes(k)))return failure('Invalid Discord callback.',400);
  try {
    const uid=await discordIdentity(config,code);if(uid!==config.owner)return response('This Discord account is not authorised for Admin. Saved data is unchanged.',403,{},[clearState(),clearSession()]);
    const token=await sign(config,'session',SESSION_SECONDS,{uid});return response(null,303,{Location:'/priority-review.html'},[clearState(),setCookie(SESSION_COOKIE,token,SESSION_SECONDS)]);
  }catch{return failure('Discord sign-in could not be completed. Saved data is unchanged. Try again from Admin.',502);}
}

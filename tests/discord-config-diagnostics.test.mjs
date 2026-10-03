import assert from 'node:assert/strict';
import {adminAllowed,adminSignIn,discordRoute} from '../discord-auth.js';
const origin='https://tracker.pages.dev';
const valid={ADMIN_AUTH_MODE:'discord',ADMIN_AUTH_ORIGIN:origin,DISCORD_CLIENT_ID:'123456789012345678',DISCORD_ADMIN_ID:'234567890123456789',DISCORD_CLIENT_SECRET:'private-client-secret-fixture',ADMIN_SESSION_SECRET:'private-session-secret-fixture-longer-than-43-characters'};
const originalError=console.error,originalFetch=globalThis.fetch;
let logs=[],calls=0;
console.error=(...args)=>logs.push(args);
globalThis.fetch=()=>{calls++;throw Error('Unexpected provider call');};
const request=new Request(origin+'/auth/discord/login');
try {
  for(const [name,value] of Object.entries({DISCORD_CLIENT_ID:'invalid-private-id',DISCORD_ADMIN_ID:' invalid-private-owner ',DISCORD_CLIENT_SECRET:'short-private',ADMIN_SESSION_SECRET:'short-private',ADMIN_AUTH_ORIGIN:origin+'/'})) {
    for(const broken of [{...valid,[name]:value},{...valid,[name]:undefined}]) {
      logs=[];
      const result=await discordRoute(request,broken);
      assert.equal(result.status,503);
      assert.equal(await result.text(),'Discord Admin sign-in is not configured yet.');
      assert.deepEqual(logs,[['Admin configuration invalid',name]]);
      assert.equal(await adminAllowed(request,broken),false);
      assert.equal(adminSignIn(broken).status,503);
      assert(logs.every(args=>JSON.stringify(args)===JSON.stringify(['Admin configuration invalid',name])));
    }
  }
  logs=[];
  await discordRoute(request,{...valid,DISCORD_ADMIN_ID:undefined,ADMIN_SESSION_SECRET:undefined});
  assert.deepEqual(logs,[['Admin configuration invalid','DISCORD_ADMIN_ID,ADMIN_SESSION_SECRET']]);
  console.error=()=>{throw Error('private logging sink exception');};
  assert.equal((await discordRoute(request,{...valid,ADMIN_SESSION_SECRET:undefined})).status,503);
  assert.equal(adminSignIn({...valid,ADMIN_SESSION_SECRET:undefined}).status,503);
  assert.equal(await adminAllowed(request,{...valid,ADMIN_SESSION_SECRET:undefined}),false);
  assert.equal(calls,0);
  console.error=(...args)=>logs.push(args);logs=[];
  assert.equal(adminSignIn(valid).status,200);assert.deepEqual(logs,[]);
  console.log('Discord configuration diagnostics passed, fixed names only, fail closed, logging sink isolation.');
} finally {console.error=originalError;globalThis.fetch=originalFetch;}

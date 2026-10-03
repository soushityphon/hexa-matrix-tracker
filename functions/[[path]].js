import worker from '../dist/server/index.js';

// Every Pages route goes through the existing Worker, including public assets.
// Pages and future custom domains must never inherit Sites-header authority.
export function onRequest(context) {
  return worker.fetch(context.request, { ...context.env, ADMIN_AUTH_MODE: 'discord' });
}

// CI-only adapter for the exact compiled Worker and isolated public read fixtures.
import { createServer } from 'node:http';
import worker from '../../dist/server/index.js';
import { fixtures } from './fixtures.mjs';

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4173');
    const job = url.searchParams.get('job') === '렌' ? 'ren' : 'hoyoung';
    let response;
    if (url.pathname === '/api/tracker-catalogue') response = Response.json(fixtures[job].model);
    else if (url.pathname === '/api/priority-preview') response = Response.json({ drafts: fixtures[job].drafts });
    else response = await worker.fetch(new Request(url, { method: req.method }), {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500); res.end('Isolated QA server failed');
  }
});
server.listen(4173, '127.0.0.1');

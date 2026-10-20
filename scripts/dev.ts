// Podgląd: http://localhost:5173 (także w sieci lokalnej). Gra budowana przy każdym
// odświeżeniu, bez service workera (żeby pamięć podręczna nie podsuwała starej wersji).
// Manifest i ikony serwowane z dist/ (budowane raz przy starcie).
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { join, normalize } from 'node:path';
import { buildAll, bundleApp, renderHtml } from './build.ts';

const PORT = Number(process.env.PORT ?? 5173);
const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.js': 'text/javascript',
};

await buildAll();

createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0]!;
  try {
    if (path === '/' || path === '/index.html') {
      const html = await renderHtml(await bundleApp({ minify: false, pwa: false }));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
      return;
    }
    const file = normalize(join('dist', path));
    const ext = path.slice(path.lastIndexOf('.'));
    if (!file.startsWith('dist') || !TYPES[ext] || path === '/sw.js') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[ext]!, 'cache-control': 'no-store' }).end(await readFile(file));
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(error));
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Planet Forge: http://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) console.log(`  w sieci lokalnej: http://${net.address}:${PORT}`);
    }
  }
});

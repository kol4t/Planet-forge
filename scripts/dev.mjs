// Podgląd: buduje przy każdym odświeżeniu strony i serwuje na :5173 (także w sieci lokalnej).
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { build } from 'esbuild';
import { buildOptions, renderHtml } from './build.mjs';

const PORT = Number(process.env.PORT ?? 5173);

createServer(async (req, res) => {
  if (req.url !== '/' && !req.url.startsWith('/?') && req.url !== '/index.html') {
    res.writeHead(404).end();
    return;
  }
  try {
    const result = await build({ ...buildOptions, minify: false, sourcemap: 'inline' });
    const html = await renderHtml(result.outputFiles[0].text);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
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

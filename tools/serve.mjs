/**
 * Serves `docs/` on http://127.0.0.1 with GitHub Pages' answers, to look at a state before it
 * is pushed. Plain http, so the mixed content error cannot show here; `local-run.mjs` serves
 * over https for the audit itself.
 *
 * Usage: node tools/serve.mjs [port, default 8080]. Stop with Ctrl+C.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSiteDir } from '../src/adapters/site-dir.mjs';
import { startPagesServer } from '../src/adapters/pages-server.mjs';

const port = Number(process.argv[2] ?? 8080);
const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const server = await startPagesServer({ files: readSiteDir(docs), port });
console.log(`Serving docs/ at http://127.0.0.1:${server.port}/`);

const stop = () => {
    server.close().then(() => process.exit(0));
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

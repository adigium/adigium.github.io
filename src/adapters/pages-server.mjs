/**
 * A local stand-in for GitHub Pages: serves a map of files on 127.0.0.1, over https when given
 * a certificate. How it answers is decided in `lib/pages-routing.mjs`; this file only moves
 * bytes. It listens on the loopback address only, so nothing else on the network can reach it.
 */
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { route } from '../lib/pages-routing.mjs';

/**
 * Starts the server and resolves once it listens. `tls` is `{ cert, key }` in PEM, or null for
 * plain http. The files can be swapped while it runs, which is how one server shows state `a`
 * and then state `b`, the way one Pages site does between two pushes.
 */
export async function startPagesServer({ files, tls = null, port = 0 }) {
    let current = files;
    const requests = [];
    const scheme = tls === null ? 'http' : 'https';
    const handler = (req, res) => {
        const origin = `${scheme}://${req.headers.host ?? '127.0.0.1'}`;
        const answer = route(current, req.method ?? 'GET', req.url ?? '/', origin);
        requests.push(`${req.method} ${req.url} ${answer.status}`);
        res.writeHead(answer.status, answer.headers);
        res.end(req.method === 'HEAD' ? undefined : answer.body);
    };
    const server = tls === null ? createHttpServer(handler) : createHttpsServer(tls, handler);
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    return {
        port: server.address().port,
        requests,
        setFiles(next) {
            current = next;
        },
        close() {
            server.closeAllConnections();
            return new Promise((resolve) => {
                server.close(() => resolve());
            });
        },
    };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { route, contentTypeOf } from '../src/lib/pages-routing.mjs';
import { startPagesServer } from '../src/adapters/pages-server.mjs';

const ORIGIN = 'https://adigium.github.io';
const FILES = new Map([
    ['index.html', Buffer.from('<h1>home</h1>')],
    ['menu/index.html', Buffer.from('<h1>menu</h1>')],
    ['old-menu.html', Buffer.from('<h1>old</h1>')],
    ['images/a.png', Buffer.alloc(2000)],
    ['404.html', Buffer.from('<h1>Page not found</h1>')],
]);

test('route - ok, a folder with its slash serves its index', () => {
    const answer = route(FILES, 'GET', '/menu/', ORIGIN);
    assert.equal(answer.status, 200);
    assert.equal(answer.body.toString(), '<h1>menu</h1>');
    assert.equal(answer.headers['cache-control'], 'max-age=600');
});

test('route - ok, a folder without its slash answers 301 to the absolute URL with it', () => {
    const answer = route(FILES, 'GET', '/menu?x=1', ORIGIN);
    assert.equal(answer.status, 301);
    assert.equal(answer.headers.location, 'https://adigium.github.io/menu/?x=1');
});

test('route - ok, a file answers 200 with its length and type', () => {
    const answer = route(FILES, 'HEAD', '/images/a.png', ORIGIN);
    assert.equal(answer.status, 200);
    assert.equal(answer.headers['content-length'], '2000');
    assert.equal(answer.headers['content-type'], 'image/png');
});

test('route - ok, an extensionless URL serves the .html file of that name', () => {
    assert.equal(route(FILES, 'GET', '/old-menu', ORIGIN).body.toString(), '<h1>old</h1>');
});

test('route - fail, a missing path answers 404 with the site\'s own 404 page', () => {
    for (const path of ['/blog/rye-bread/', '/nope', '/menu/%2e%2e/secret', '/%E0%A4%A']) {
        const answer = route(FILES, 'GET', path, ORIGIN);
        assert.equal(answer.status, 404, path);
        assert.equal(answer.body.toString(), '<h1>Page not found</h1>', path);
    }
});

test('route - fail, a method other than GET or HEAD answers 405', () => {
    assert.equal(route(FILES, 'POST', '/', ORIGIN).status, 405);
});

test('contentTypeOf - ok, a dot in a folder name is not an extension', () => {
    assert.equal(contentTypeOf('a.b/index'), 'application/octet-stream');
    assert.equal(contentTypeOf('sitemap.xml'), 'application/xml');
});

test('startPagesServer - ok, the redirect and HEAD go over a real socket, and files can be swapped', async () => {
    const server = await startPagesServer({ files: FILES });
    try {
        const base = `http://127.0.0.1:${server.port}`;
        const moved = await fetch(`${base}/menu`, { redirect: 'manual' });
        assert.equal(moved.status, 301);
        assert.equal(moved.headers.get('location'), `${base}/menu/`);
        const head = await fetch(`${base}/images/a.png`, { method: 'HEAD' });
        assert.equal(head.headers.get('content-length'), '2000');
        assert.equal((await head.arrayBuffer()).byteLength, 0);
        server.setFiles(new Map([['404.html', Buffer.from('gone')]]));
        const gone = await fetch(`${base}/menu/`);
        assert.equal(gone.status, 404);
        assert.equal(await gone.text(), 'gone');
        assert.deepEqual(server.requests, ['GET /menu 301', 'HEAD /images/a.png 200', 'GET /menu/ 404']);
    } finally {
        await server.close();
    }
});

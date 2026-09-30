import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteFiles, PUBLISHED_HOST, sitemapPaths } from '../src/lib/site.mjs';

const LOCAL = 'https://adigium.localtest.me:8443';

test('siteFiles - ok, the same state builds the same bytes twice', () => {
    for (const state of ['a', 'b']) {
        const first = siteFiles(state);
        const second = siteFiles(state);
        assert.deepEqual([...first.keys()], [...second.keys()]);
        for (const [path, bytes] of first) assert.ok(bytes.equals(second.get(path)), path);
    }
});

test('siteFiles - ok, state b differs from state a only where the twelve edits are', () => {
    const a = siteFiles('a');
    const b = siteFiles('b');
    const changed = [...a.keys()].filter((path) => b.has(path) && !a.get(path).equals(b.get(path))).sort();
    // An edit anywhere else would add a change row nobody planned.
    assert.deepEqual(changed, [
        'about/index.html', 'blog/index.html', 'blog/sourdough-starter/index.html', 'catering/index.html',
        'contact/index.html', 'gift-cards/index.html', 'index.html', 'menu/index.html', 'sitemap.xml',
        'wholesale/index.html',
    ]);
    assert.deepEqual([...b.keys()].filter((path) => !a.has(path)).sort(),
        ['blog/pumpkin-loaf/index.html', 'blog/rye-bread/index.html']);
    assert.deepEqual([...a.keys()].filter((path) => !b.has(path)), ['old-menu.html']);
});

test('siteFiles - ok, every absolute URL names the host it was built for', () => {
    for (const state of ['a', 'b']) {
        const text = [...siteFiles(state, LOCAL).values()].map((bytes) => bytes.toString('latin1')).join('\n');
        assert.ok(!text.includes(PUBLISHED_HOST), `state ${state} still names ${PUBLISHED_HOST}`);
        assert.ok(text.includes(`${LOCAL}/sitemap.xml`));
    }
});

test('siteFiles - ok, the menu board is over 100 KB and the hero image is far under it', () => {
    const files = siteFiles('a');
    // The tool reports an image over 100 KB (100 * 1024 bytes).
    assert.ok(files.get('images/menu-board.png').length > 100 * 1024);
    assert.ok(files.get('images/bread-hero.png').length < 10 * 1024);
});

test('siteFiles - ok, the home title is over 60 characters in a and within them in b', () => {
    const title = (state) => /<title>(.*?)<\/title>/u.exec(siteFiles(state).get('index.html').toString('utf8'))[1];
    // The tool's title check, as its README states it.
    assert.ok(title('a').length > 60, title('a'));
    assert.ok(title('b').length <= 60, title('b'));
});

test('sitemapPaths - ok, b adds the two new posts and nothing else', () => {
    assert.deepEqual(sitemapPaths('b').filter((p) => !sitemapPaths('a').includes(p)),
        ['/blog/rye-bread/', '/blog/pumpkin-loaf/']);
});

test('siteFiles - fail, an unknown state is refused', () => {
    assert.throws(() => siteFiles('c'), /Unknown state "c"/u);
});

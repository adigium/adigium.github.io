import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteFiles } from '../src/lib/site.mjs';
import { matchingState, robotsGroups, ruleViolations } from '../src/lib/site-rules.mjs';

/** State `a` and `b`, with `edit` applied to one file of one state. */
function withEdit(state, path, edit) {
    const pair = { a: siteFiles('a'), b: siteFiles('b') };
    const text = pair[state].get(path)?.toString('utf8') ?? '';
    const next = edit(text);
    if (next === null) pair[state].delete(path);
    else pair[state].set(path, Buffer.from(next, 'utf8'));
    return ruleViolations(pair.a, pair.b);
}

test('ruleViolations - ok, the demo as built keeps every rule', () => {
    assert.deepEqual(ruleViolations(siteFiles('a'), siteFiles('b')), []);
});

test('ruleViolations - fail, robots.txt differs between the states', () => {
    const broken = withEdit('b', 'robots.txt', (t) => `${t}\n`);
    assert.ok(broken.includes('robots.txt differs between state a and state b'), broken.join('; '));
});

test('ruleViolations - fail, robots.txt lets Googlebot in', () => {
    const broken = withEdit('a', 'robots.txt', (t) => t.replace('User-agent: Googlebot\nDisallow: /', 'User-agent: Googlebot\nDisallow:'));
    assert.ok(broken.includes('a: robots.txt does not keep googlebot out'), broken.join('; '));
});

test('ruleViolations - fail, robots.txt has no Bingbot group', () => {
    const broken = withEdit('a', 'robots.txt', (t) => t.replace('User-agent: Bingbot\nDisallow: /\n\n', ''));
    assert.ok(broken.includes('a: robots.txt does not keep bingbot out'), broken.join('; '));
});

test('ruleViolations - fail, the User-agent: * group disallows a path, as the first draft did', () => {
    const broken = withEdit('a', 'robots.txt', (t) => t.replace('User-agent: *\nAllow: /', 'User-agent: *\nDisallow: /drafts/'));
    assert.ok(broken.includes('a: robots.txt disallows a path for User-agent: *'), broken.join('; '));
});

test('ruleViolations - fail, the sitemap lists the gift cards page', () => {
    const broken = withEdit('a', 'sitemap.xml', (t) => t.replace('</urlset>',
        '  <url><loc>https://adigium.github.io/gift-cards/</loc></url>\n</urlset>'));
    assert.ok(broken.includes('a: the sitemap lists the gift cards page'), broken.join('; '));
});

test('ruleViolations - fail, a page without the demo note', () => {
    const broken = withEdit('b', 'blog/pumpkin-loaf/index.html', (t) => t.replace(/<p class="demo-note"[\s\S]*?<\/p>/u, ''));
    assert.ok(broken.includes('b: blog/pumpkin-loaf/index.html does not carry the demo note'), broken.join('; '));
});

test('ruleViolations - fail, a demo note that no longer names the tool it is for', () => {
    const broken = withEdit('a', '404.html', (t) => t.replace(/<a href="https:\/\/apify\.com[^"]*">/u, '<a href="/">'));
    assert.ok(broken.includes('a: 404.html does not carry the demo note'), broken.join('; '));
});

test('ruleViolations - fail, a page that could take an order or show a price', () => {
    const form = withEdit('a', 'gift-cards/index.html', (t) => t.replace('</main>', '<form action="/buy"></form></main>'));
    assert.ok(form.includes('a: gift-cards/index.html has a form'), form.join('; '));
    const price = withEdit('a', 'menu/index.html', (t) => t.replace('Country sourdough, 900 g.', 'Country sourdough, $6.50.'));
    assert.ok(price.includes('a: menu/index.html shows a price'), price.join('; '));
});

test('ruleViolations - fail, a page names a real bakery', () => {
    const broken = withEdit('a', 'about/index.html', (t) => t.replace('opened in a former', 'Harbor Street Bakery opened in a former'));
    assert.ok(broken.includes('a: about/index.html names a real business, Harbor Street Bakery'), broken.join('; '));
});

test('ruleViolations - fail, .nojekyll is missing', () => {
    const broken = withEdit('b', '.nojekyll', () => null);
    assert.ok(broken.includes('b: .nojekyll is missing'), broken.join('; '));
});

test('robotsGroups - ok, user agents named together share the rules after them', () => {
    const groups = robotsGroups('User-agent: A\nUser-agent: B\nDisallow: /x # note\n\nUser-agent: *\nAllow: /\n');
    assert.deepEqual(groups, [
        { agents: ['a', 'b'], rules: [{ field: 'disallow', value: '/x' }] },
        { agents: ['*'], rules: [{ field: 'allow', value: '/' }] },
    ]);
});

test('matchingState - ok, docs built from a state is that state', () => {
    const candidates = { a: siteFiles('a'), b: siteFiles('b') };
    assert.equal(matchingState(siteFiles('b'), candidates), 'b');
});

test('matchingState - fail, one byte changed is neither state', () => {
    const candidates = { a: siteFiles('a'), b: siteFiles('b') };
    const files = siteFiles('a');
    const bytes = Buffer.from(files.get('style.css'));
    bytes[0] ^= 1;
    files.set('style.css', bytes);
    assert.equal(matchingState(files, candidates), null);
});

test('matchingState - fail, an extra file is neither state', () => {
    const candidates = { a: siteFiles('a'), b: siteFiles('b') };
    const files = siteFiles('a');
    files.set('notes.txt', Buffer.from('x'));
    assert.equal(matchingState(files, candidates), null);
});

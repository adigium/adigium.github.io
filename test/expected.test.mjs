import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    CHANGES_B, CHANGE_TYPES, EXPECTED, coverageClaim, differences, measuredFrom, missingChangeTypes,
} from '../src/lib/expected.mjs';

/** A measured run identical to what is expected, to break one part at a time. */
function asMeasured(state) {
    return structuredClone(EXPECTED[state]);
}

test('differences - ok, a run that shows exactly the expected findings', () => {
    assert.deepEqual(differences(EXPECTED.a, asMeasured('a')), []);
    assert.deepEqual(differences(EXPECTED.b, asMeasured('b')), []);
});

test('differences - fail, another health score or page count', () => {
    const run = { ...asMeasured('a'), healthScore: 64, pagesCrawled: 14 };
    assert.deepEqual(differences(EXPECTED.a, run), [
        'healthScore: expected 69, got 64',
        'pagesCrawled: expected 13, got 14',
    ]);
});

test('differences - fail, the header says pages were left out, as the first draft made it say', () => {
    const run = {
        ...asMeasured('a'),
        coverage: 'some pages found were left out',
        notes: ['Some pages were not fetched because your robots.txt disallows them, so the orphan page check was skipped.'],
    };
    const lines = differences(EXPECTED.a, run);
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^coverage: expected "every page found was checked"/u);
    assert.match(lines[1], /^notes: expected \[\]/u);
});

test('differences - fail, a finding is missing', () => {
    const run = asMeasured('a');
    delete run.issues.orphanPage;
    assert.deepEqual(differences(EXPECTED.a, run), ['issue orphanPage: expected ["/catering/"], got []']);
});

test('differences - fail, a finding lands on another page, or one more appears', () => {
    const run = asMeasured('b');
    run.issues.linksToRedirect = ['/'];
    run.issues.sitemapUrlBlocked = ['/drafts/spring-sale/'];
    assert.deepEqual(differences(EXPECTED.b, run), [
        'issue linksToRedirect: expected ["/blog/"], got ["/"]',
        'issue sitemapUrlBlocked: expected [], got ["/drafts/spring-sale/"]',
    ]);
});

test('differences - fail, a change row is missing, doubled or not planned', () => {
    const run = asMeasured('b');
    run.changes = run.changes.filter((c) => c.changeType !== 'url-added');
    run.changes.push({ changeType: 'title-changed', changeStatus: 'CHANGED', path: '/' });
    run.changes.push({ changeType: 'url-removed', changeStatus: 'GONE', path: '/drafts/spring-sale/' });
    assert.deepEqual(differences(EXPECTED.b, run), [
        'change title-changed CHANGED /: expected 1 row, got 2',
        'change url-added NEW /blog/pumpkin-loaf/: expected 1 row, got 0',
        'change url-removed GONE /drafts/spring-sale/: expected 0 rows, got 1',
    ]);
});

test('measuredFrom - ok, rows are cut to paths and grouped by issue', () => {
    const origin = 'https://adigium.localtest.me:8443';
    const run = {
        healthScore: 50,
        pagesCrawled: 2,
        notes: [],
        issueRows: [
            { issue: 'titleTooLong', url: `${origin}/b/` },
            { issue: 'titleTooLong', url: `${origin}/` },
            { issue: 'orphanPage', url: `${origin}/c/` },
        ],
        changeRows: [
            { changeType: 'url-removed', changeStatus: 'GONE', url: `${origin}/old` },
            { changeType: 'title-changed', changeStatus: 'CHANGED', url: `${origin}/` },
        ],
    };
    assert.deepEqual(measuredFrom(run, '<p>every page found was checked</p>', origin), {
        healthScore: 50,
        pagesCrawled: 2,
        coverage: 'every page found was checked',
        notes: [],
        issues: { titleTooLong: ['/', '/b/'], orphanPage: ['/c/'] },
        changes: [
            { changeType: 'title-changed', changeStatus: 'CHANGED', path: '/' },
            { changeType: 'url-removed', changeStatus: 'GONE', path: '/old' },
        ],
    });
});

test('coverageClaim - ok, each of the three header claims is read', () => {
    assert.equal(coverageClaim('13 pages checked / some pages found were left out'), 'some pages found were left out');
    assert.equal(coverageClaim('<strong>stopped before checking every page found</strong>'),
        'stopped before checking every page found');
});

test('coverageClaim - fail, a page that is not a report has no claim', () => {
    assert.equal(coverageClaim('<html><body>Page not found</body></html>'), null);
});

test('CHANGES_B - ok, the second run shows every kind of change the README lists', () => {
    assert.equal(CHANGE_TYPES.length, 13);
    assert.deepEqual(missingChangeTypes(CHANGES_B), []);
});

test('missingChangeTypes - fail, a feed without canonical-off-domain names it', () => {
    const without = CHANGES_B.filter((c) => c.changeType !== 'canonical-off-domain');
    assert.deepEqual(missingChangeTypes(without), ['canonical-off-domain']);
});

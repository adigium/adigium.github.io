/**
 * What the two audits of the demo must show, and the check that a run showed exactly that.
 * Pure: run records in, a list of differences out.
 *
 * Written from the site's design, before the first local run, so the run can prove the design
 * rather than describe itself. Paths only: the local run and the platform run audit the same
 * files on different hosts.
 */

/** Issue name -> the paths of its rows, sorted. */
const ISSUES_A = {
    brokenOutlink: ['/blog/sourdough-starter/'],
    brokenPage: ['/blog/rye-bread/'],
    hreflangNotReciprocal: ['/about/'],
    mixedContent: ['/about/'],
    metaRefresh: ['/old-menu.html'],
    canonicalMissing: ['/contact/', '/old-menu.html'],
    canonicalToRedirect: ['/gift-cards/'],
    h1Missing: ['/old-menu.html'],
    imagesMissingAlt: ['/menu/'],
    langMissing: ['/contact/'],
    metaDescriptionMissing: ['/contact/', '/old-menu.html'],
    orphanPage: ['/catering/'],
    sitemapUrlNoindex: ['/wholesale/'],
    thinContent: ['/contact/', '/old-menu.html'],
    duplicateMetaDescription: ['/blog/', '/blog/opening-day/'],
    headingLevelSkipped: ['/blog/opening-day/'],
    // An image finding's row is the image's own URL; its detail names the page.
    imageTooLarge: ['/images/menu-board.png'],
    imagesMissingDimensions: ['/menu/'],
    linksToRedirect: ['/'],
    notInSitemap: ['/blog/opening-day/', '/de/ueber-uns/', '/gift-cards/', '/old-menu.html'],
    notIndexable: ['/wholesale/'],
    redirected: ['/gift-cards'],
    socialTagsMissing: [
        '/about/', '/blog/', '/blog/opening-day/', '/blog/sourdough-starter/', '/catering/', '/contact/',
        '/de/ueber-uns/', '/gift-cards/', '/menu/', '/old-menu.html', '/wholesale/',
    ],
    titleTooLong: ['/', '/blog/opening-day/'],
};

const ISSUES_B = {
    hreflangNotReciprocal: ['/about/'],
    mixedContent: ['/about/'],
    canonicalMissing: ['/contact/'],
    canonicalOffDomain: ['/blog/sourdough-starter/'],
    langMissing: ['/contact/'],
    sitemapUrlCanonicalised: ['/blog/sourdough-starter/'],
    sitemapUrlNoindex: ['/catering/'],
    thinContent: ['/contact/'],
    duplicateMetaDescription: ['/blog/', '/blog/opening-day/'],
    h1Multiple: ['/about/'],
    headingLevelSkipped: ['/blog/opening-day/'],
    imageTooLarge: ['/images/menu-board.png'],
    imagesMissingDimensions: ['/menu/'],
    linksToRedirect: ['/blog/'],
    notInSitemap: ['/blog/opening-day/', '/de/ueber-uns/', '/gift-cards/'],
    notIndexable: ['/blog/sourdough-starter/', '/catering/'],
    redirected: ['/blog/opening-day'],
    socialTagsMissing: [
        '/about/', '/blog/', '/blog/opening-day/', '/blog/pumpkin-loaf/', '/blog/rye-bread/',
        '/blog/sourdough-starter/', '/catering/', '/contact/', '/de/ueber-uns/', '/gift-cards/', '/menu/',
        '/wholesale/',
    ],
    titleTooLong: ['/blog/opening-day/'],
};

/**
 * Every `changeType` the Actor reports, as its README lists them under "Every `changeType` you
 * can filter on" (the tool's README, 26 Sep 2026).
 */
export const CHANGE_TYPES = [
    'url-added', 'url-removed', 'status-changed', 'title-changed', 'meta-description-changed',
    'canonical-changed', 'canonical-off-domain', 'became-noindex', 'became-indexable',
    'redirect-chain-grew', 'redirect-chain-removed', 'h1-count-changed', 'images-missing-alt-changed',
];

/** The kinds of change a feed does not show at least once. */
export function missingChangeTypes(changes) {
    const shown = new Set(changes.map((c) => c.changeType));
    return CHANGE_TYPES.filter((type) => !shown.has(type));
}

/**
 * The edit behind each change row of the second run. Every `changeType` in the README's table
 * appears at least once. Two edits give more than one row, because the Actor reports what
 * follows from them too: an off-domain canonical also changes the canonical and takes the page
 * out of search, and the gift cards fix changes the canonical as well as the redirect.
 */
export const CHANGES_B = [
    { changeType: 'became-indexable', changeStatus: 'FIXED', path: '/wholesale/', edit: 'noindex removed' },
    { changeType: 'became-noindex', changeStatus: 'CHANGED', path: '/blog/sourdough-starter/', edit: 'canonical moved to example.com' },
    { changeType: 'became-noindex', changeStatus: 'CHANGED', path: '/catering/', edit: 'noindex added' },
    { changeType: 'canonical-changed', changeStatus: 'CHANGED', path: '/blog/sourdough-starter/', edit: 'canonical moved to example.com' },
    { changeType: 'canonical-changed', changeStatus: 'CHANGED', path: '/gift-cards/', edit: 'canonical given its slash' },
    { changeType: 'canonical-off-domain', changeStatus: 'CHANGED', path: '/blog/sourdough-starter/', edit: 'canonical moved to example.com' },
    { changeType: 'h1-count-changed', changeStatus: 'CHANGED', path: '/about/', edit: 'second H1 added' },
    { changeType: 'images-missing-alt-changed', changeStatus: 'FIXED', path: '/menu/', edit: 'alt text added' },
    { changeType: 'meta-description-changed', changeStatus: 'CHANGED', path: '/contact/', edit: 'meta description added' },
    { changeType: 'redirect-chain-grew', changeStatus: 'CHANGED', path: '/blog/opening-day', edit: 'journal link lost its slash' },
    { changeType: 'redirect-chain-removed', changeStatus: 'FIXED', path: '/gift-cards/', edit: 'home link given its slash' },
    { changeType: 'status-changed', changeStatus: 'FIXED', path: '/blog/rye-bread/', edit: 'missing post written' },
    { changeType: 'title-changed', changeStatus: 'CHANGED', path: '/', edit: 'home title rewritten' },
    { changeType: 'url-added', changeStatus: 'NEW', path: '/blog/pumpkin-loaf/', edit: 'new post, linked and in the sitemap' },
    { changeType: 'url-removed', changeStatus: 'GONE', path: '/old-menu.html', edit: 'stub deleted and unlinked' },
];

export const EXPECTED = {
    a: {
        // trunc(100 * pages without an error / pages): 9 of 13.
        healthScore: 69,
        pagesCrawled: 13,
        coverage: 'every page found was checked',
        notes: [],
        issues: ISSUES_A,
        changes: [],
    },
    b: {
        // 12 of 13: only /about/ keeps an error.
        healthScore: 92,
        pagesCrawled: 13,
        coverage: 'every page found was checked',
        notes: [],
        issues: ISSUES_B,
        changes: CHANGES_B.map(({ changeType, changeStatus, path }) => ({ changeType, changeStatus, path })),
    },
};

/** The report header's claim about coverage, as `report.ts` words it. */
const COVERAGE_CLAIMS = [
    'every page found was checked',
    'some pages found were left out',
    'stopped before checking every page found',
];

export function coverageClaim(reportHtml) {
    return COVERAGE_CLAIMS.find((claim) => reportHtml.includes(claim)) ?? null;
}

function pathOf(url, origin) {
    return url.startsWith(origin) ? url.slice(origin.length) : url;
}

/**
 * The parts of one run that `EXPECTED` speaks about, with URLs cut to paths. `run` is the JSON
 * `tools/actor-pipeline.mjs` writes; `origin` is the host the run audited.
 */
export function measuredFrom(run, reportHtml, origin) {
    const issues = {};
    for (const row of run.issueRows) {
        (issues[row.issue] ??= []).push(pathOf(row.url, origin));
    }
    for (const paths of Object.values(issues)) paths.sort();
    const changes = run.changeRows
        .map((row) => ({ changeType: row.changeType, changeStatus: row.changeStatus, path: pathOf(row.url, origin) }))
        .sort((x, y) => `${x.changeType} ${x.path}`.localeCompare(`${y.changeType} ${y.path}`));
    return {
        healthScore: run.healthScore,
        pagesCrawled: run.pagesCrawled,
        coverage: coverageClaim(reportHtml),
        notes: run.notes,
        issues,
        changes,
    };
}

function sameList(x, y) {
    return JSON.stringify(x) === JSON.stringify(y);
}

/**
 * Every way `measured` differs from `expected`, one line each. Empty means the run showed
 * exactly what the demo was built to show: no finding missing, and none extra.
 */
export function differences(expected, measured) {
    const lines = [];
    for (const field of ['healthScore', 'pagesCrawled', 'coverage']) {
        if (expected[field] !== measured[field]) {
            lines.push(`${field}: expected ${JSON.stringify(expected[field])}, got ${JSON.stringify(measured[field])}`);
        }
    }
    if (!sameList(expected.notes, measured.notes)) {
        lines.push(`notes: expected ${JSON.stringify(expected.notes)}, got ${JSON.stringify(measured.notes)}`);
    }
    const names = new Set([...Object.keys(expected.issues), ...Object.keys(measured.issues)]);
    for (const name of [...names].sort()) {
        const want = expected.issues[name] ?? [];
        const got = measured.issues[name] ?? [];
        if (!sameList(want, got)) lines.push(`issue ${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }
    // Counted, not just listed: the same row twice is a finding the buyer would see twice.
    const tally = (changes) => {
        const counts = new Map();
        for (const c of changes) {
            const key = `${c.changeType} ${c.changeStatus} ${c.path}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return counts;
    };
    const want = tally(expected.changes);
    const got = tally(measured.changes);
    for (const key of [...new Set([...want.keys(), ...got.keys()])].sort()) {
        const w = want.get(key) ?? 0;
        const g = got.get(key) ?? 0;
        if (w !== g) lines.push(`change ${key}: expected ${w} row${w === 1 ? '' : 's'}, got ${g}`);
    }
    return lines;
}

/**
 * The rules the demo site must keep whatever the Actor does. Pure: the two states' files in, a
 * list of broken rules out, one line each. Empty means the site can be published.
 *
 * Each rule is here because breaking it cost, or would cost, a finding or a false impression:
 *  - robots.txt must be byte-identical in both states. The Actor fingerprints it, and a changed
 *    file makes the second run withhold its newly found and no longer found rows.
 *  - The `User-agent: *` group, the only one the Actor reads, must allow everything. A single
 *    URL it may not fetch switches the orphan page check off and puts "some pages found were
 *    left out" on the Report's first screen (skeptic, 26 Sep 2026, with the Actor's own code).
 *  - Search engines stay out by name, so a made-up bakery never shows up in search.
 *  - The gift cards page stays out of the sitemap. Listed, it is fetched at `/gift-cards/`
 *    first, the home page's link to `/gift-cards` is skipped as already seen, and both redirect
 *    findings disappear.
 *  - Every page says it is a demo, and nothing on it sells or takes anything.
 */
import { BUSINESS, STORE_URL } from './site.mjs';

/** Names of real businesses found by a web search on 27 Sep 2026. The demo must never use them. */
export const REAL_BUSINESS_NAMES = ['Harbor Street Bakery', 'Harbour Street Bakery'];

/** robots.txt as groups: the user agents named together, and the rules that follow them. */
export function robotsGroups(text) {
    const groups = [];
    let current = null;
    for (const raw of text.split(/\r?\n/u)) {
        const line = raw.replace(/#.*$/u, '').trim();
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const field = line.slice(0, colon).trim().toLowerCase();
        const value = line.slice(colon + 1).trim();
        if (field === 'user-agent') {
            // Consecutive user-agent lines share the rules that follow them.
            if (current === null || current.rules.length > 0) {
                current = { agents: [], rules: [] };
                groups.push(current);
            }
            current.agents.push(value.toLowerCase());
        } else if ((field === 'allow' || field === 'disallow') && current !== null) {
            current.rules.push({ field, value });
        }
    }
    return groups;
}

function groupFor(groups, agent) {
    return groups.find((g) => g.agents.includes(agent)) ?? null;
}

function blocksAll(group) {
    return group !== null && group.rules.some((r) => r.field === 'disallow' && r.value === '/')
        && !group.rules.some((r) => r.field === 'allow' && r.value !== '');
}

function blocksAnything(group) {
    return group === null ? false : group.rules.some((r) => r.field === 'disallow' && r.value !== '');
}

function text(files, path) {
    return files.get(path)?.toString('utf8') ?? null;
}

function sitemapLocs(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => m[1]);
}

function stateRules(label, files) {
    const broken = [];
    const robots = text(files, 'robots.txt');
    if (robots === null) {
        broken.push(`${label}: robots.txt is missing`);
    } else {
        const groups = robotsGroups(robots);
        for (const agent of ['googlebot', 'bingbot']) {
            if (!blocksAll(groupFor(groups, agent))) broken.push(`${label}: robots.txt does not keep ${agent} out`);
        }
        if (groupFor(groups, '*') === null) broken.push(`${label}: robots.txt has no User-agent: * group`);
        if (blocksAnything(groupFor(groups, '*'))) broken.push(`${label}: robots.txt disallows a path for User-agent: *`);
    }
    const sitemap = text(files, 'sitemap.xml');
    if (sitemap === null) {
        broken.push(`${label}: sitemap.xml is missing`);
    } else if (sitemapLocs(sitemap).some((loc) => /\/gift-cards\/?$/u.test(loc))) {
        broken.push(`${label}: the sitemap lists the gift cards page`);
    }
    for (const required of ['.nojekyll', '404.html', 'index.html']) {
        if (!files.has(required)) broken.push(`${label}: ${required} is missing`);
    }
    for (const [path, bytes] of files) {
        if (!path.endsWith('.html')) continue;
        const html = bytes.toString('utf8');
        const note = /<p class="demo-note"[^>]*>([\s\S]*?)<\/p>/u.exec(html)?.[1] ?? '';
        if (!note.includes('Demo site.') || !note.includes('sells nothing') || !note.includes(STORE_URL)) {
            broken.push(`${label}: ${path} does not carry the demo note`);
        }
        // "Sells nothing" has to be true of the page, not only said by it.
        if (/<form\b/iu.test(html)) broken.push(`${label}: ${path} has a form`);
        if (/[$€£]\s?\d/u.test(html)) broken.push(`${label}: ${path} shows a price`);
        if (!html.includes(BUSINESS)) broken.push(`${label}: ${path} does not name ${BUSINESS}`);
        for (const name of REAL_BUSINESS_NAMES) {
            if (html.includes(name)) broken.push(`${label}: ${path} names a real business, ${name}`);
        }
    }
    return broken;
}

/** Every rule the pair of states breaks. */
export function ruleViolations(filesA, filesB) {
    const broken = [...stateRules('a', filesA), ...stateRules('b', filesB)];
    const robotsA = filesA.get('robots.txt');
    const robotsB = filesB.get('robots.txt');
    if (robotsA !== undefined && robotsB !== undefined && !robotsA.equals(robotsB)) {
        broken.push('robots.txt differs between state a and state b');
    }
    return broken;
}

/** Which state a set of files is, byte for byte, or null for neither. */
export function matchingState(files, candidates) {
    for (const [state, expected] of Object.entries(candidates)) {
        const same = files.size === expected.size
            && [...expected].every(([path, bytes]) => files.get(path)?.equals(bytes) === true);
        if (same) return state;
    }
    return null;
}

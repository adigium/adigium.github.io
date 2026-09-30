/**
 * The demo site, both states, as files. Pure: a state and a host in, a map of file paths to
 * bytes out. Nothing here touches the disk or the network.
 *
 * State `a` is what the first audit sees. State `b` is the site after the edit made before the
 * second audit: twelve edits, which between them give the change feed every kind of change the
 * Actor reports. Which edit gives which change row is in `expected.mjs`.
 *
 * The problems are deliberate, and every page says so at the top.
 */
import { png, xorshift32 } from './png.mjs';

export const STATES = ['a', 'b'];

/** Where the published site lives. The local run builds the same files for another host. */
export const PUBLISHED_HOST = 'https://adigium.github.io';

export const STORE_URL = 'https://apify.com/ozzie_bagadirov/seo-audit-change-monitor';

export const BUSINESS = 'Quillmere Bakehouse';

/**
 * Where state `b` points the starter post's canonical. `example.com` is reserved for examples
 * (RFC 2606), so the change names nobody's real site.
 */
export const OFF_DOMAIN_CANONICAL = 'https://example.com/recipes/sourdough-starter/';

/** The stylesheet `/about/` loads over http, for the mixed content error. Reserved host too. */
export const HTTP_STYLESHEET = 'http://example.com/fonts/lora.css';

/**
 * The note at the top of every page, the 404 page and the redirect stub included. Plain words,
 * because the people who read it are buyers looking at an SEO tool, not bakers.
 */
export function demoNote() {
    return `<p class="demo-note" role="note"><strong>Demo site.</strong> ${BUSINESS} is made up and sells nothing. `
        + `This site shows what <a href="${STORE_URL}">SEO Audit &amp; Change Monitor</a>, an SEO audit tool, finds. `
        + 'Its SEO problems are on purpose.</p>';
}

const NAV = [
    ['/', 'Home'], ['/menu/', 'Menu'], ['/blog/', 'Journal'], ['/about/', 'About'], ['/contact/', 'Contact'],
];

const CSS = `body{font:17px/1.6 Georgia,serif;max-width:44rem;margin:0 auto;padding:1rem;color:#222;background:#fdfaf5}
.demo-note{margin:0 0 1rem;padding:.6rem .8rem;border:2px solid #b45309;border-radius:6px;background:#fff7ed;font:15px/1.5 system-ui,sans-serif}
header{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;border-bottom:1px solid #ddd}
nav a{margin-left:1rem}img{max-width:100%;height:auto}
`;

function paragraphs(...lines) {
    return lines.map((line) => `<p>${line}</p>`).join('\n');
}

function page(host, { lang = 'en', title, description, canonical, robots, head = '', h1, extraH1 = '', body, social = false }) {
    const meta = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${title}</title>`,
        description === undefined ? '' : `<meta name="description" content="${description}">`,
        canonical === undefined ? '' : `<link rel="canonical" href="${canonical}">`,
        robots === undefined ? '' : `<meta name="robots" content="${robots}">`,
        social ? `<meta property="og:title" content="${title}">\n<meta property="og:image" content="${host}/images/bread-hero.png">` : '',
        '<link rel="stylesheet" href="/style.css">',
        head,
    ].filter((line) => line !== '').join('\n');
    const nav = NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join(' ');
    return `<!doctype html>
<html${lang === null ? '' : ` lang="${lang}"`}>
<head>
${meta}
</head>
<body>
${demoNote()}
<header><p class="brand">${BUSINESS}</p><nav>${nav}</nav></header>
<main>
<h1>${h1}</h1>
${extraH1}
${body}
</main>
</body>
</html>
`;
}

/** Each entry: file path -> (state, host) => html, or null when the state has no such file. */
const PAGES = {
    'index.html': (s, host) => page(host, {
        // 65 characters in `a`, over the 60 the Actor allows; 53 in `b`.
        title: s === 'a'
            ? `${BUSINESS} | Sourdough, Rye and Pastries Baked Every Day`
            : `${BUSINESS} | Fresh Bread Baked Every Morning`,
        description: 'A neighbourhood bakery on Mill Lane: sourdough, rye, seasonal loaves and pastries, baked every morning from six.',
        canonical: `${host}/`,
        social: true,
        h1: 'Bread baked every morning on Mill Lane',
        head: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Bakery","name":"${BUSINESS}",`
            + `"description":"A made-up bakery on a demo site.","url":"${host}/"}</script>`,
        // The images are generated patterns, not photos, and their alt text says so.
        body: `<img src="/images/bread-hero.png" alt="A warm brown pattern in place of a photo of bread" width="640" height="360">
${paragraphs(
        'We open at six, and the first sourdough comes out of the oven at half past. Everything on the shelves was mixed, shaped and baked here, in the small kitchen behind the counter, by four bakers who have worked together for years.',
        'The menu changes with the seasons. In autumn there is a pumpkin loaf and a spiced rye; in spring, a light wheat bread with herbs from the market across the road. The croissants and the country loaf never leave.',
        // `a` links the gift cards page without its slash, so the link answers with a redirect.
        `You can order a whole loaf the day before and collect it on your way to work, or ask about <a href="${s === 'a' ? '/gift-cards' : '/gift-cards/'}">gift cards</a> for someone who loves bread. We also bake for <a href="/wholesale/">cafes and restaurants</a> nearby.`,
        'Read the <a href="/blog/">journal</a> for recipes and news from the kitchen, or see what is on the <a href="/menu/">menu</a> today.',
    )}`,
    }),
    'menu/index.html': (s, host) => page(host, {
        title: `Menu | ${BUSINESS}`,
        description: `Today's loaves, pastries and prices at ${BUSINESS}, with the seasonal breads we bake this month.`,
        canonical: `${host}/menu/`,
        h1: 'Menu',
        // No width or height in either state. The alt text arrives in `b`.
        body: `<img src="/images/menu-board.png"${s === 'b' ? ' alt="A dark speckled square in place of a photo of the menu board"' : ''}>
${paragraphs(
        'Country sourdough, 900 g. A long, slow rise, a dark crust and an open crumb. Our most popular loaf and the one we started with.',
        'Spiced rye, 700 g. Dense and dark, with caraway and a little honey. It keeps for a week wrapped in a cloth, and it is best sliced thin.',
        'Seeded wheat, 800 g. Sunflower, pumpkin and flax seeds, toasted before they go into the dough. Good for sandwiches and for toast.',
        'Croissants and pain au chocolat, every morning until they are gone, usually by eleven. On Saturdays we bake a second batch at ten.',
        'Ask at the counter about loaves for allergies. We bake everything in one kitchen, so we cannot promise that any bread is free of nuts or seeds.',
    )}`,
    }),
    'about/index.html': (s, host) => page(host, {
        title: `About the bakery | ${BUSINESS}`,
        description: `Who bakes your bread: the story of ${BUSINESS}, our kitchen, our flour and the people behind the counter.`,
        canonical: `${host}/about/`,
        // The German page never names this one back, and the style sheet is on http.
        head: `<link rel="alternate" hreflang="en" href="${host}/about/">
<link rel="alternate" hreflang="de" href="${host}/de/ueber-uns/">
<link rel="stylesheet" href="${HTTP_STYLESHEET}">`,
        h1: 'About the bakery',
        extraH1: s === 'b' ? '<h1>Our story</h1>' : '',
        body: paragraphs(
            `${BUSINESS} opened in a former bicycle shop with one oven and two bakers. The oven is still there, although it now shares the kitchen with a second one and a proving cabinet we bought from a bakery that closed down the road.`,
            'We buy our flour from a mill two hours north, which grinds wheat and rye from farms it knows by name. We use no improvers and no premixes, and our starter is older than the shop.',
            'Most of the team came to baking from somewhere else: a sailor, a teacher, a sound engineer and a nurse. What they share is an early start and a stubborn opinion about crust.',
            'There is a <a href="/de/ueber-uns/">German version of this page</a> for visitors from our sister town.',
        ),
    }),
    'de/ueber-uns/index.html': (_s, host) => page(host, {
        lang: 'de',
        title: `Über uns | ${BUSINESS}`,
        description: `Wer Ihr Brot backt: die Geschichte des ${BUSINESS}, unsere Backstube, unser Mehl und unser Team.`,
        canonical: `${host}/de/ueber-uns/`,
        h1: 'Über die Bäckerei',
        body: paragraphs(
            `Das ${BUSINESS} begann in einem ehemaligen Fahrradladen mit einem Ofen und zwei Bäckern. Der Ofen steht noch immer dort, auch wenn er sich die Backstube heute mit einem zweiten Ofen und einem Gärschrank teilt.`,
            'Unser Mehl kommt aus einer Mühle zwei Stunden nördlich von hier, die Weizen und Roggen von Höfen mahlt, die sie beim Namen kennt. Wir verwenden keine Backmischungen und keine Zusatzstoffe, und unser Sauerteig ist älter als der Laden.',
            'Die meisten im Team kamen von woanders zum Backen: ein Seemann, eine Lehrerin, ein Tontechniker und eine Krankenpflegerin. Gemeinsam haben sie den frühen Arbeitsbeginn und eine feste Meinung über die Kruste.',
        ),
    }),
    'contact/index.html': (s, host) => page(host, {
        lang: null,
        title: `Contact | ${BUSINESS}`,
        description: s === 'b' ? `Where to find ${BUSINESS}, when we are open, and how to order a loaf for the next morning.` : undefined,
        h1: 'Contact',
        body: paragraphs('On Mill Lane. Open every day from six until two.'),
    }),
    'blog/index.html': (s, host) => page(host, {
        title: `Journal | ${BUSINESS}`,
        // The same description as the opening day post: a template default nobody replaced.
        description: `Recipes and stories from the kitchen at ${BUSINESS}.`,
        canonical: `${host}/blog/`,
        h1: 'Journal',
        body: `<ul>
${s === 'b' ? '<li><a href="/blog/pumpkin-loaf/">The pumpkin loaf is back</a></li>\n' : ''}<li><a href="/blog/sourdough-starter/">How to keep a sourdough starter alive</a></li>
<li><a href="${s === 'a' ? '/blog/opening-day/' : '/blog/opening-day'}">Opening day</a></li>
${s === 'a' ? '<li><a href="/old-menu.html">Our old menu</a></li>\n' : ''}</ul>
${paragraphs(
        'The journal is where the bakers write about what they are working on: a new loaf, a recipe that took a year to get right, or the day the power went out at four in the morning and we baked by torchlight.',
        'New posts appear about once a month. The recipes are written for a home kitchen and an ordinary oven, and every one of them has been tested by someone who is not a baker.',
    )}`,
    }),
    'blog/opening-day/index.html': (_s, host) => page(host, {
        title: `Opening day at ${BUSINESS}: the story of our very first morning, told by the bakers`,
        description: `Recipes and stories from the kitchen at ${BUSINESS}.`,
        canonical: `${host}/blog/opening-day/`,
        h1: 'Opening day',
        body: `<h2>The night before</h2>
${paragraphs('We had planned to sleep, and nobody did. The second oven had arrived that afternoon, the flour was stacked in the hall, and the shelves were still wet with paint when the first dough went into the proving cabinet at midnight.')}
<h4>What we baked</h4>
${paragraphs(
        'Forty country loaves, sixty croissants and a tray of cinnamon buns that we had not planned at all. The queue started at half past five, and by nine there was nothing left but crumbs and a very tired team.',
        'We still bake the same country loaf every morning, from the same starter, in the same oven. The cinnamon buns became a Saturday tradition that we have never dared to stop.',
    )}`,
    }),
    'blog/sourdough-starter/index.html': (s, host) => page(host, {
        title: `How to keep a sourdough starter alive | ${BUSINESS}`,
        description: 'Feed it, keep it warm, and throw half away: how our bakers keep a sourdough starter healthy at home.',
        // `b`: the post now names a copy on another site as the original.
        canonical: s === 'a' ? `${host}/blog/sourdough-starter/` : OFF_DOMAIN_CANONICAL,
        h1: 'How to keep a sourdough starter alive',
        body: paragraphs(
            'A starter is flour, water and patience. Feed it once a day with equal weights of flour and water, keep it somewhere warm, and throw half of it away before each feed so it does not take over the kitchen.',
            'If you bake once a week, keep it in the fridge and feed it the day before you bake. A starter that smells of nail varnish is hungry, not dead: feed it twice and it will recover.',
            'When your starter doubles within six hours of a feed, it is ready to bake with. Our <a href="/blog/rye-bread/">rye bread recipe</a> is a good first loaf, because rye forgives a sleepy starter more than wheat does.',
            'Questions about your starter are welcome at the counter. We have seen every kind of problem, and most of them are solved by a warmer spot and a little more time.',
        ),
    }),
    'blog/rye-bread/index.html': (s, host) => (s === 'a' ? null : page(host, {
        title: `A simple rye bread recipe | ${BUSINESS}`,
        description: 'Our spiced rye, written for a home kitchen: a dense, dark loaf with caraway and honey that keeps for a week.',
        canonical: `${host}/blog/rye-bread/`,
        h1: 'A simple rye bread',
        body: paragraphs(
            'Rye does not behave like wheat. It has little gluten, so the dough is sticky and does not stretch, and the loaf is baked in a tin rather than shaped by hand.',
            'Mix 500 g of dark rye flour with 400 g of water, 100 g of active starter, 10 g of salt, a spoon of honey and a spoon of caraway seeds. Stir until there is no dry flour left, press it into a greased tin and leave it covered for four to six hours.',
            'Bake at 230 degrees for fifteen minutes, then at 200 degrees for another forty. Let it rest for a whole day before slicing, wrapped in a cloth. It is worth the wait.',
        ),
    })),
    'blog/pumpkin-loaf/index.html': (s, host) => (s === 'a' ? null : page(host, {
        title: `The pumpkin loaf is back | ${BUSINESS}`,
        description: 'Our autumn pumpkin loaf returns to the shelves this week: roasted pumpkin, toasted seeds and a golden crumb.',
        canonical: `${host}/blog/pumpkin-loaf/`,
        h1: 'The pumpkin loaf is back',
        body: paragraphs(
            'Every October the pumpkin loaf returns, and every October someone asks why we do not bake it all year. The answer is the pumpkins: we roast them ourselves, from a farm that only has them for a few weeks.',
            'The dough is our seeded wheat with a third of roasted pumpkin folded in, which gives the crumb its colour and a little sweetness. The crust is rolled in toasted pumpkin seeds before it goes into the oven.',
            'It will be on the shelves from Tuesday to Saturday until the pumpkins run out, usually around the middle of November.',
        ),
    })),
    // A stub that sends the browser on with a meta refresh, the way an old CMS page often does.
    'old-menu.html': (s) => (s === 'b' ? null : `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Old menu | ${BUSINESS}</title>
<meta http-equiv="refresh" content="0; url=/menu/">
<link rel="stylesheet" href="/style.css">
</head>
<body>
${demoNote()}
<p>Our menu has moved. <a href="/menu/">See the current menu</a>.</p>
</body>
</html>
`),
    'catering/index.html': (s, host) => page(host, {
        title: `Catering for offices and events | ${BUSINESS}`,
        description: 'Bread, pastries and sandwiches for offices, meetings and events near Mill Lane, delivered before nine.',
        canonical: `${host}/catering/`,
        robots: s === 'b' ? 'noindex' : undefined,
        h1: 'Catering',
        body: paragraphs(
            'We deliver bread, pastries and sandwiches to offices and events within two miles of the bakery, every weekday before nine in the morning.',
            'A standing order can change from week to week. Tell us by noon the day before, and we will bake for the number of people you expect, with a little more for the ones who arrive late.',
            'For weddings and larger events we bake loaves to order and can build a bread table with butters and spreads. Ask us at least two weeks ahead, because the ovens fill up quickly in the summer months.',
        ),
    }),
    'wholesale/index.html': (s, host) => page(host, {
        title: `Wholesale bread for cafes | ${BUSINESS}`,
        description: 'Daily bread for cafes and restaurants: our loaves and rolls delivered fresh each morning, with a weekly standing order.',
        canonical: `${host}/wholesale/`,
        robots: s === 'a' ? 'noindex' : undefined,
        h1: 'Wholesale',
        body: paragraphs(
            'Six cafes and two restaurants near Mill Lane serve our bread. We deliver every morning before seven, and the order can change up to noon the day before.',
            'We bake the same loaves for our wholesale customers as we sell over the counter, and we do not make a cheaper version. Prices depend on the size of the standing order.',
            'If you run a cafe or a restaurant and would like to try our bread, come to the counter any afternoon and we will give you a loaf of each kind to take away and taste with your team.',
        ),
    }),
    'gift-cards/index.html': (s, host) => page(host, {
        title: `Gift cards | ${BUSINESS}`,
        description: `Give someone a week of fresh bread: ${BUSINESS} gift cards, sold at the counter in any amount.`,
        // `a`: the canonical drops the slash, so it names a URL that redirects.
        canonical: s === 'a' ? `${host}/gift-cards` : `${host}/gift-cards/`,
        h1: 'Gift cards',
        body: paragraphs(
            'Our gift cards are sold at the counter in any amount, and they never expire. They can be spent on anything we bake, including a standing order for a loaf each week.',
            'A card for a month of Saturday loaves is our most popular gift: four country loaves, collected on four Saturdays, with a croissant thrown in each time for the person who comes to collect.',
            'Cards are printed on thick paper from the mill that supplies our flour, and each one is signed by the baker who is on the counter that day.',
        ),
    }),
    '404.html': () => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | ${BUSINESS}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
${demoNote()}
<main><h1>Page not found</h1><p><a href="/">Back to the bakery</a></p></main>
</body>
</html>
`,
};

/**
 * Paths the sitemap lists. Left out on purpose, for the "not in sitemap" notice: the German
 * page, the opening day post and the gift cards page. The gift cards page also has to stay out
 * for a second reason: listed, it is fetched at `/gift-cards/` first, the home page's link to
 * `/gift-cards` is then skipped as already seen, and neither redirect finding appears.
 */
export function sitemapPaths(state) {
    const paths = ['/', '/menu/', '/about/', '/contact/', '/blog/', '/blog/sourdough-starter/', '/catering/', '/wholesale/'];
    if (state === 'b') paths.splice(6, 0, '/blog/rye-bread/', '/blog/pumpkin-loaf/');
    return paths;
}

function sitemap(state, host) {
    const urls = sitemapPaths(state).map((path) => `  <url><loc>${host}${path}</loc></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * The same in both states, byte for byte: the Actor fingerprints robots.txt, and a changed file
 * makes the second run withhold its newly found and no longer found rows.
 *
 * Search engines are kept out by name. The Actor reads only the `User-agent: *` group, and
 * that group allows everything: a URL it may not fetch would switch the orphan page check off.
 */
export function robotsTxt(host) {
    return `# A demo site for an SEO audit tool. Search engines are kept out.
User-agent: Googlebot
Disallow: /

User-agent: Bingbot
Disallow: /

User-agent: *
Allow: /

Sitemap: ${host}/sitemap.xml
`;
}

/**
 * The menu board: noise, so it stays over the 100 KB the image check allows. The seed is fixed
 * so every build writes the same bytes.
 */
function menuBoard() {
    const next = xorshift32(2463534242);
    const shade = (base) => base + (next() % 90);
    return png(320, 220, () => [shade(20), shade(25), shade(20)]);
}

/** The hero image: a small warm gradient, far under 100 KB. */
function hero() {
    return png(64, 36, (x, y) => [180 + (x % 20), 140 + (y % 20), 90]);
}

/**
 * Every file of one state, keyed by its path under the site root, with no leading slash.
 */
export function siteFiles(state, host = PUBLISHED_HOST) {
    if (!STATES.includes(state)) throw new Error(`Unknown state "${state}": use one of ${STATES.join(', ')}.`);
    const root = host.replace(/\/$/u, '');
    const files = new Map();
    for (const [path, make] of Object.entries(PAGES)) {
        const html = make(state, root);
        if (html !== null) files.set(path, Buffer.from(html, 'utf8'));
    }
    files.set('sitemap.xml', Buffer.from(sitemap(state, root), 'utf8'));
    files.set('robots.txt', Buffer.from(robotsTxt(root), 'utf8'));
    files.set('style.css', Buffer.from(CSS, 'utf8'));
    // GitHub Pages runs Jekyll unless this file exists.
    files.set('.nojekyll', Buffer.alloc(0));
    files.set('images/menu-board.png', menuBoard());
    files.set('images/bread-hero.png', hero());
    return files;
}

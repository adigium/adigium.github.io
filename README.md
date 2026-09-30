# Demo site for SEO Audit & Change Monitor

This repository publishes `https://adigium.github.io/`, a small website with SEO problems on
purpose. It exists to show what [SEO Audit & Change Monitor](https://apify.com/ozzie_bagadirov/seo-audit-change-monitor),
an SEO audit tool on Apify, finds and what it reports as changed between two runs.

- **Quillmere Bakehouse is made up.** It is not a real bakery, it has no address, and the site
  sells nothing. Every page says so at the top.
- **The problems are deliberate.** Please do not report them.
- **Search engines are kept out.** `robots.txt` disallows Googlebot and Bingbot. The audit tool
  reads only the `User-agent: *` group, which allows everything.

## Two states

The site has two versions. The first audit runs on state `a`. State `b` is the same site after
an edit, and the second audit reports what changed.

State `a` has these problems:

| Page | Problem |
|---|---|
| `/` | Title over 60 characters. Links to `/gift-cards`, which redirects to `/gift-cards/` |
| `/menu/` | Image without alt text or size, 171 KB |
| `/about/` | hreflang names `/de/ueber-uns/`, which does not name it back. Loads a style sheet over http |
| `/de/ueber-uns/` | Not in the sitemap |
| `/contact/` | No meta description, no canonical, no `lang`, very little text |
| `/blog/` | Same meta description as the opening day post |
| `/blog/opening-day/` | Title too long, an H4 right after an H2, not in the sitemap |
| `/blog/sourdough-starter/` | Links to `/blog/rye-bread/`, which does not exist |
| `/old-menu.html` | Sends visitors on with a meta refresh |
| `/catering/` | In the sitemap, but no page links to it |
| `/wholesale/` | Marked `noindex`, and in the sitemap |
| `/gift-cards/` | Its canonical names `/gift-cards`, which redirects. Not in the sitemap |

State `b` makes twelve edits. Together they give one of each kind of change the tool reports:

| Edit | Change reported |
|---|---|
| New home page title | `title-changed` |
| `/blog/rye-bread/` written | `status-changed`, 404 to 200 |
| `/old-menu.html` deleted and unlinked | `url-removed` |
| `/blog/pumpkin-loaf/` added | `url-added` |
| Alt text on the menu image | `images-missing-alt-changed` |
| Meta description on `/contact/` | `meta-description-changed` |
| `noindex` on `/catering/` | `became-noindex` |
| `noindex` removed from `/wholesale/` | `became-indexable` |
| Home link to the gift cards page fixed, and its canonical | `redirect-chain-removed`, `canonical-changed` |
| Journal link to the opening day post loses its slash | `redirect-chain-grew` |
| A second H1 on `/about/` | `h1-count-changed` |
| The starter post's canonical moved to `example.com` | `canonical-off-domain`, `canonical-changed`, `became-noindex` |

## Build

Node 22 or later. No dependencies.

```
node build.mjs a     # writes state a into docs/
node build.mjs b     # writes state b into docs/
npm run verify       # the tests, including that docs/ is exactly one of the two states
node tools/serve.mjs # serves docs/ on http://127.0.0.1:8080 the way GitHub Pages does
```

GitHub Pages publishes `docs/` from the `main` branch.

## Tools

- `tools/capture.mjs` makes a PNG of one part of a report, with the Chrome installed on the
  machine: the top, one section (`--part Changes`) or one issue opened (`--issue "Broken link"`).
- `src/lib/expected.mjs` lists what each audit must find, written before the first run.

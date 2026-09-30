/**
 * How GitHub Pages answers a request for a static site, as far as the audit can see it. Pure:
 * the site's files and a request in, a response out.
 *
 * Each rule is what curl showed on a live Pages site (the assets lane and its skeptic, 26 Sep
 * 2026, on pages.github.com):
 *
 *  - a folder asked for without its slash answers 301, to the absolute URL with the slash;
 *  - a missing path answers 404 with the site's own `404.html`;
 *  - every file carries `content-length`, which is what the image size check reads;
 *  - `cache-control: max-age=600`.
 *
 * `/name` also serves `name.html`, as Pages does for extensionless URLs. Not measured here;
 * no page of the demo links a URL of that shape, so no finding depends on it.
 */

export const CACHE_CONTROL = 'max-age=600';

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.xml': 'application/xml',
    '.txt': 'text/plain; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
};

export function contentTypeOf(path) {
    const dot = path.lastIndexOf('.');
    const slash = path.lastIndexOf('/');
    const extension = dot > slash ? path.slice(dot).toLowerCase() : '';
    return TYPES[extension] ?? 'application/octet-stream';
}

function fileResponse(status, path, body) {
    return {
        status,
        headers: {
            'content-type': contentTypeOf(path),
            'content-length': String(body.length),
            'cache-control': CACHE_CONTROL,
        },
        body,
    };
}

function notFound(files) {
    const page = files.get('404.html') ?? Buffer.from('Not found', 'utf8');
    return fileResponse(404, '404.html', page);
}

/**
 * The response to one request. `files` maps paths under the site root (no leading slash) to
 * bytes; `origin` is the scheme and host the request came in on, for the redirect's
 * `location`. The body is returned for HEAD too; the server leaves it out.
 */
export function route(files, method, rawUrl, origin) {
    if (method !== 'GET' && method !== 'HEAD') {
        return { status: 405, headers: { allow: 'GET, HEAD', 'content-length': '0' }, body: Buffer.alloc(0) };
    }
    const url = new URL(rawUrl, origin);
    let path;
    try {
        path = decodeURIComponent(url.pathname);
    } catch {
        return notFound(files);
    }
    // Files come from a map, not the disk, so a path cannot climb out of the site: `new URL`
    // has already resolved any `..`, and what is left is either a key or it is not.
    const relative = path.replace(/^\/+/u, '');

    if (relative === '' || path.endsWith('/')) {
        const index = `${relative}index.html`;
        return files.has(index) ? fileResponse(200, index, files.get(index)) : notFound(files);
    }
    if (files.has(relative)) return fileResponse(200, relative, files.get(relative));
    if (files.has(`${relative}/index.html`)) {
        const body = Buffer.from('<html><body>301 Moved Permanently</body></html>\n', 'utf8');
        return {
            status: 301,
            headers: {
                location: `${url.origin}${url.pathname}/${url.search}`,
                'content-type': 'text/html; charset=utf-8',
                'content-length': String(body.length),
                'cache-control': CACHE_CONTROL,
            },
            body,
        };
    }
    if (files.has(`${relative}.html`)) return fileResponse(200, `${relative}.html`, files.get(`${relative}.html`));
    return notFound(files);
}

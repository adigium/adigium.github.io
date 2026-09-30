/**
 * The site on disk: `docs/`, which GitHub Pages publishes. Reading and writing only; what goes
 * in it is decided in `lib/site.mjs`.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

/** Every file under `dir`, keyed by its path below it with `/` separators. */
export function readSiteDir(dir) {
    const files = new Map();
    const walk = (at) => {
        for (const name of readdirSync(at).sort()) {
            const path = join(at, name);
            if (statSync(path).isDirectory()) walk(path);
            else files.set(relative(dir, path).split(sep).join('/'), readFileSync(path));
        }
    };
    walk(dir);
    return files;
}

/**
 * Replaces `dir` with exactly these files. The folder is emptied first, so a page the state
 * does not have is gone from it, the way a deleted page is gone from the site after a push.
 */
export function writeSiteDir(dir, files) {
    rmSync(dir, { recursive: true, force: true });
    for (const [path, bytes] of files) {
        const target = join(dir, ...path.split('/'));
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
    }
}

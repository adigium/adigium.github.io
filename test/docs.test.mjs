import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteFiles } from '../src/lib/site.mjs';
import { matchingState } from '../src/lib/site-rules.mjs';
import { readSiteDir, writeSiteDir } from '../src/adapters/site-dir.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('docs - ok, docs/ holds state a or state b exactly as build.mjs writes it', () => {
    // A hand edit in docs/ would publish a site the generator, the rules and the local run
    // never saw.
    const state = matchingState(readSiteDir(join(ROOT, 'docs')), { a: siteFiles('a'), b: siteFiles('b') });
    assert.ok(state === 'a' || state === 'b', 'docs/ matches neither state: run node build.mjs a (or b)');
});

test('writeSiteDir - ok, a file the new state does not have is gone from the folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'demo-docs-'));
    try {
        writeSiteDir(dir, siteFiles('a'));
        writeSiteDir(dir, siteFiles('b'));
        const files = readSiteDir(dir);
        assert.equal(files.has('old-menu.html'), false);
        assert.equal(matchingState(files, { a: siteFiles('a'), b: siteFiles('b') }), 'b');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('tools - ok, every script parses', () => {
    for (const script of ['build.mjs', 'tools/capture.mjs', 'tools/serve.mjs']) {
        const result = spawnSync(process.execPath, ['--check', join(ROOT, script)], { encoding: 'utf8' });
        assert.equal(result.status, 0, `${script}: ${result.stderr}`);
    }
});

test('tools - fail, the syntax check catches a script that does not parse', () => {
    const dir = mkdtempSync(join(tmpdir(), 'demo-check-'));
    try {
        const broken = join(dir, 'broken.mjs');
        writeFileSync(broken, 'export const x = ;\n');
        assert.notEqual(spawnSync(process.execPath, ['--check', broken]).status, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

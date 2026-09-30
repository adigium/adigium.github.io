/**
 * Renders a run's `report.html` with the local Chrome, headless, and saves one part of it as a
 * PNG clipped to the report column. Zero dependencies: it speaks the DevTools protocol over
 * Chrome's pipe, so no port is opened.
 *
 * Usage:
 *   node tools/capture.mjs <report.html> <out.png>                      the top: score, trend and summary
 *   node tools/capture.mjs <report.html> <out.png> --part Changes       one numbered section, by its title
 *                                                                        or the start of it
 *   node tools/capture.mjs <report.html> <out.png> --issue "Broken link" the Issues section down to that
 *                                                                        row, opened as a click opens it
 *   --max-height <css px> cuts any of these at that height.
 *
 * Why not `chrome --headless --screenshot`: it wrote a PNG and then did not exit within 90 s
 * (assets lane, 26 Sep 2026), and it cannot open a row or clip to the column.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MARGIN, SCALE, VIEWPORT_HEIGHT, VIEWPORT_WIDTH, clipFor } from '../src/lib/capture-clip.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** The whole capture, Chrome's start included. Measured runs take about 2 s. */
const DEADLINE_MS = 60_000;

function parseArgs(argv) {
    const positional = [];
    const flags = {};
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i].startsWith('--')) {
            flags[argv[i].slice(2)] = argv[i + 1];
            i += 1;
        } else {
            positional.push(argv[i]);
        }
    }
    return { report: positional[0], out: positional[1], part: flags.part, issue: flags.issue, maxHeight: flags['max-height'] };
}

/**
 * Runs in the page. Finds the column and the region to show, opens the row asked for, and
 * returns rectangles measured from the top of the page. Names what exists when asked for
 * something that does not, so a typo costs one run, not a guess.
 */
function locate(target) {
    const pageRect = (el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, bottom: r.bottom + window.scrollY };
    };
    const column = document.querySelector('main.doc');
    if (column === null) return { error: 'No main.doc in this page: is it a report.html?' };
    const parts = [...document.querySelectorAll('section.part')];
    const titleOf = (part) => {
        const heading = part.querySelector('.part-title');
        const number = heading?.querySelector('.part-no')?.textContent ?? '';
        return (heading?.textContent ?? '').slice(number.length).trim();
    };
    let region;
    if (target.issue !== undefined) {
        const rows = [...document.querySelectorAll('details.issue')];
        const row = rows.find((d) => d.querySelector('.issue-name')?.textContent.trim() === target.issue);
        if (row === undefined) {
            return { error: `No issue row "${target.issue}". Rows: ${rows.map((d) => d.querySelector('.issue-name')?.textContent.trim()).join(', ')}` };
        }
        row.open = true;
        const part = row.closest('section.part') ?? row;
        // Ends at the row's own edge: a margin below it showed the top of the next row, cut off.
        region = { top: pageRect(part).top, bottom: pageRect(row).bottom, bottomMargin: 0 };
    } else if (target.part !== undefined) {
        // Exact first, then by its start: a second run titles the section "Changes since 26 Sep 2026",
        // and `Issues` must not pick "Issues by area".
        const part = parts.find((p) => titleOf(p) === target.part)
            ?? parts.find((p) => titleOf(p).startsWith(`${target.part} `));
        if (part === undefined) return { error: `No section "${target.part}". Sections: ${parts.map(titleOf).join(', ')}` };
        const r = pageRect(part);
        region = { top: r.top, bottom: r.bottom };
    } else {
        // The first screen a buyer sees: the masthead and section 01 below it.
        const first = parts[0];
        region = { top: pageRect(column).top, bottom: first === undefined ? pageRect(column).bottom : pageRect(first).bottom };
    }
    return { column: pageRect(column), region, pageWidth: document.documentElement.scrollWidth };
}

/** The DevTools protocol over fds 3 and 4: one JSON message per NUL-terminated chunk. */
function connect(chrome) {
    let nextId = 0;
    let buffered = '';
    const pending = new Map();
    const waiters = [];
    chrome.stdio[4].on('data', (chunk) => {
        buffered += chunk.toString('utf8');
        let end = buffered.indexOf('\0');
        while (end !== -1) {
            const message = JSON.parse(buffered.slice(0, end));
            buffered = buffered.slice(end + 1);
            end = buffered.indexOf('\0');
            if (message.id !== undefined && pending.has(message.id)) {
                const { ok, fail } = pending.get(message.id);
                pending.delete(message.id);
                if (message.error === undefined) ok(message.result);
                else fail(new Error(`${message.error.message} (${JSON.stringify(message.error.data ?? '')})`));
            } else if (message.method !== undefined) {
                for (const waiter of waiters.filter((w) => w.method === message.method)) {
                    waiters.splice(waiters.indexOf(waiter), 1);
                    waiter.ok(message.params);
                }
            }
        }
    });
    return {
        send(method, params = {}, sessionId = undefined) {
            nextId += 1;
            const id = nextId;
            return new Promise((ok, fail) => {
                pending.set(id, { ok, fail });
                chrome.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
            });
        },
        once(method) {
            return new Promise((ok) => {
                waiters.push({ method, ok });
            });
        },
    };
}

async function capture({ report, out, part, issue, maxHeight }) {
    const profile = mkdtempSync(join(tmpdir(), 'report-capture-'));
    const chrome = spawn(CHROME, [
        '--headless', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run',
        '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--disable-extensions', 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
    const exited = new Promise((done) => {
        chrome.once('exit', done);
    });
    const deadline = setTimeout(() => chrome.kill('SIGKILL'), DEADLINE_MS);
    try {
        const cdp = connect(chrome);
        const { targetInfos } = await cdp.send('Target.getTargets');
        const pageTarget = targetInfos.find((t) => t.type === 'page');
        const { targetId } = pageTarget ?? await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        const send = (method, params) => cdp.send(method, params, sessionId);
        await send('Page.enable');
        await send('Emulation.setDeviceMetricsOverride', {
            width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: SCALE, mobile: false,
        });
        // The report has a dark theme; a README image should not depend on the machine's setting.
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
        const loaded = cdp.once('Page.loadEventFired');
        await send('Page.navigate', { url: pathToFileURL(resolve(report)).href });
        await loaded;
        const { result, exceptionDetails } = await send('Runtime.evaluate', {
            expression: `(async () => { await document.fonts.ready; window.scrollTo(0, 0);
                return JSON.stringify((${locate.toString()})(${JSON.stringify({ part, issue })})); })()`,
            awaitPromise: true,
            returnByValue: true,
        });
        if (exceptionDetails !== undefined) throw new Error(`The page threw: ${exceptionDetails.text}`);
        const found = JSON.parse(result.value);
        if (found.error !== undefined) throw new Error(found.error);
        const clip = clipFor({
            column: found.column,
            region: found.region,
            pageWidth: found.pageWidth,
            maxHeight: maxHeight === undefined ? null : Number(maxHeight),
        });
        const shot = await send('Page.captureScreenshot', {
            format: 'png', clip: { ...clip, scale: 1 }, captureBeyondViewport: true,
        });
        writeFileSync(out, Buffer.from(shot.data, 'base64'));
        await cdp.send('Browser.close').catch(() => undefined);
        return clip;
    } finally {
        // Measured: Chrome exits about 0.1 s after `Browser.close`. The fallback timer is unref'd,
        // because a pending timer kept Node alive for its full 5 s after Chrome had gone.
        await Promise.race([exited, new Promise((done) => setTimeout(done, 5_000).unref())]);
        if (chrome.exitCode === null) chrome.kill('SIGKILL');
        clearTimeout(deadline);
        rmSync(profile, { recursive: true, force: true });
    }
}

const args = parseArgs(process.argv.slice(2));
if (args.report === undefined || args.out === undefined) {
    console.error('Usage: node tools/capture.mjs <report.html> <out.png> [--part <title> | --issue <name>] [--max-height <css px>]');
    process.exit(2);
}
try {
    const clip = await capture(args);
    console.log(`Wrote ${args.out}: ${Math.trunc(clip.width * SCALE)} x ${Math.trunc(clip.height * SCALE)} px `
        + `(the report column plus ${MARGIN} px, at scale ${SCALE}).`);
} catch (error) {
    console.error(`Not captured: ${error.message}`);
    process.exit(1);
}

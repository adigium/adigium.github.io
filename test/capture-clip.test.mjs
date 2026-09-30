import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARGIN, SCALE, VIEWPORT_WIDTH, clipFor } from '../src/lib/capture-clip.mjs';

// The report column as Chrome laid it out at 1200 px: `.doc{max-width:1000px;margin:0 auto}`.
const COLUMN = { left: 100, width: 1000 };

test('clipFor - ok, the column plus the margin on every side', () => {
    assert.deepEqual(clipFor({ column: COLUMN, region: { top: 0, bottom: 800 }, pageWidth: 1200 }),
        { x: 100 - MARGIN, y: 0, width: 1000 + 2 * MARGIN, height: 800 + MARGIN });
    assert.deepEqual(clipFor({ column: COLUMN, region: { top: 1500, bottom: 1700 }, pageWidth: 1200 }),
        { x: 76, y: 1476, width: 1048, height: 248 });
});

test('clipFor - ok, a row that ends the clip gets no margin below it', () => {
    const clip = clipFor({ column: COLUMN, region: { top: 1500, bottom: 1700, bottomMargin: 0 }, pageWidth: 1200 });
    assert.equal(clip.y + clip.height, 1700);
});

test('clipFor - ok, a maximum height cuts from the top of the region', () => {
    assert.equal(clipFor({ column: COLUMN, region: { top: 100, bottom: 5000 }, pageWidth: 1200, maxHeight: 900 }).height, 900);
});

test('clipFor - ok, a column wider than the page is cut at the page edge', () => {
    assert.deepEqual(clipFor({ column: { left: 0, width: 1200 }, region: { top: 10, bottom: 20 }, pageWidth: 1200 }),
        { x: 0, y: 0, width: 1200, height: 44 });
});

test('clipFor - ok, the viewport at its scale is the 1,800 px the Store keeps', () => {
    assert.equal(VIEWPORT_WIDTH * SCALE, 1800);
});

test('clipFor - fail, a column with no width means the report did not render', () => {
    assert.throws(() => clipFor({ column: { left: 0, width: 0 }, region: { top: 0, bottom: 10 }, pageWidth: 1200 }),
        /no width/u);
});

test('clipFor - fail, an empty region is refused rather than written as an empty image', () => {
    assert.throws(() => clipFor({ column: COLUMN, region: { top: 50, bottom: 50 }, pageWidth: 1200 }), /Nothing to show/u);
});

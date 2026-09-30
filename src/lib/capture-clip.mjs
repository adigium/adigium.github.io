/**
 * Which part of a rendered report a README screenshot shows. Pure: rectangles in CSS pixels,
 * measured from the top of the page, in; one clip out.
 *
 * The clip is the report column plus a margin, never the whole window: at 1200 px the window is
 * wider than the column, and the grey on each side is wasted width in a README.
 */

/** The margin kept around the column and the region, in CSS pixels (assets.md, 3.4). */
export const MARGIN = 24;

/** Viewport and scale from assets.md 3.4: 1200 CSS px at 1.5 is 1,800 px, the Store's image cap. */
export const VIEWPORT_WIDTH = 1200;
export const VIEWPORT_HEIGHT = 900;
export const SCALE = 1.5;

/**
 * `column` is the report column (`main.doc`): left and width. `region` is what to show: top and
 * bottom, and optionally `bottomMargin` when the margin below would show the next element cut
 * off. `pageWidth` bounds the clip on the right. `maxHeight`, when given, cuts the clip at that
 * height, from the top of the region.
 */
export function clipFor({ column, region, pageWidth, maxHeight = null, margin = MARGIN }) {
    if (column.width <= 0) throw new Error('The report column has no width: was the report rendered?');
    if (region.bottom <= region.top) throw new Error(`Nothing to show: the region is ${region.top}-${region.bottom}.`);
    const x = Math.max(0, column.left - margin);
    const right = Math.min(pageWidth, column.left + column.width + margin);
    const y = Math.max(0, region.top - margin);
    const full = region.bottom + (region.bottomMargin ?? margin) - y;
    return {
        x,
        y,
        width: right - x,
        height: maxHeight === null ? full : Math.min(full, maxHeight),
    };
}

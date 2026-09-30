/**
 * A PNG writer with no dependency, for the demo site's two images. Pure: the same pixels give
 * the same bytes, so a rebuild of an unchanged state changes nothing in `docs/`.
 */
import { deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
        c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
});

function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) {
        c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
}

/**
 * An 8-bit RGB image. `pixel(x, y)` returns `[r, g, b]`, each 0-255.
 */
export function png(width, height, pixel) {
    const stride = width * 3 + 1;
    const raw = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y += 1) {
        // Filter type 0 on every row: the noise image must stay large, and a smarter filter
        // is the one thing that could shrink it below the 100 KB the check is about.
        raw[y * stride] = 0;
        for (let x = 0; x < width; x += 1) {
            const [r, g, b] = pixel(x, y);
            const at = y * stride + 1 + x * 3;
            raw[at] = r;
            raw[at + 1] = g;
            raw[at + 2] = b;
        }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bit depth
    header[9] = 2; // colour type: RGB
    return Buffer.concat([
        SIGNATURE,
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/**
 * xorshift32. Integers only, so the noise is the same on every machine and every Node version.
 */
export function xorshift32(seed) {
    let state = seed >>> 0;
    return () => {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state;
    };
}

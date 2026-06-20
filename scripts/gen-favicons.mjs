/**
 * Derives the two favicon assets the brand handoff does NOT ship, from the
 * official files that live in public/:
 *   public/favicon.ico   <- 16 + 32 (official transparent PNGs) + 48 (from svg)
 *   public/icon-192.png  <- downscaled from official icon-512.png
 *
 * Everything else in public/ (favicon.svg, favicon-16/32.png,
 * apple-touch-icon.png, icon-512.png) are the designer's final assets, dropped
 * in verbatim from design_handoff_brand_marks. Re-run after replacing those:
 *   node scripts/gen-favicons.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = (f) => readFileSync(join(PUB, f));

// icon-192 from the official 512 — preserves the designer's framing exactly.
await sharp(read('icon-512.png')).resize(192, 192).png().toFile(join(PUB, 'icon-192.png'));

// 48px transparent render from the SVG, for crisp Windows taskbar sizes.
const png48 = await sharp(read('favicon.svg'), { density: 512 }).resize(48, 48).png().toBuffer();

// Pack favicon.ico (16 / 32 / 48), all 32-bit PNG-compressed entries.
const imgs = [
  { s: 16, b: read('favicon-16.png') },
  { s: 32, b: read('favicon-32.png') },
  { s: 48, b: png48 },
];
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(imgs.length, 4);
let offset = 6 + imgs.length * 16;
const entries = [];
for (const { s, b } of imgs) {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(b.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += b.length;
  entries.push(e);
}
writeFileSync(join(PUB, 'favicon.ico'), Buffer.concat([header, ...entries, ...imgs.map((i) => i.b)]));

// Eyeball preview (temp only, never committed).
await sharp(read('favicon.svg'), { density: 512 })
  .resize(256, 256)
  .flatten({ background: '#e9e4d8' })
  .png()
  .toFile(join(tmpdir(), 'opqai-favicon-preview.png'));

console.log('Derived favicon.ico (16/32/48) and icon-192.png from official assets.');

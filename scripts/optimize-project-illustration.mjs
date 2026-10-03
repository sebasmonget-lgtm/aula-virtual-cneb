import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error("Usage: node scripts/optimize-project-illustration.mjs source destination");
const metadata = await sharp(source).metadata();
if (!metadata.hasAlpha) throw new Error("Project illustrations require an alpha channel");
const maxBytes = 6 * 1024;
let output;
for (const quality of [80, 72, 64, 56, 48, 40, 32, 24]) {
  output = await sharp(source).resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
  if (output.length <= maxBytes) break;
}
// A denser two-person composition can use a smaller drawing inside the same 160px canvas.
for (const contentSize of [144, 128]) {
  if (output.length <= maxBytes) break;
  const margin = (160 - contentSize) / 2;
  for (const quality of [72, 56, 40, 24]) {
    output = await sharp(source).resize(contentSize, contentSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: margin, bottom: margin, left: margin, right: margin, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality, alphaQuality: 80, effort: 6 }).toBuffer();
    if (output.length <= maxBytes) break;
  }
}
if (output.length > maxBytes) throw new Error("Illustration exceeds 6 KiB after compression");
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, output);
console.log(JSON.stringify({ width: 160, height: 160, bytes: output.length }));

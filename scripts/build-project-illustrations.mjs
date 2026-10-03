import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

const specification = JSON.parse(await readFile("assets/project-illustrations/spec.json", "utf8"));
const root = "public/project-illustrations";
const check = process.argv.includes("--check");
async function save(file, content) {
  if (check) {
    if (await readFile(file, "utf8") !== content) throw new Error(`Stale illustration metadata: ${file}`);
  } else await writeFile(file, content);
}
const images = [];
for (const { generation_prompt: prompt, ...spec } of specification.images) {
  if (!prompt || !/^[a-z]+(?:_[a-z]+)*$/.test(spec.id)) throw new Error("Invalid illustration specification");
  const file = `${spec.id}.webp`;
  const bytes = await readFile(`${root}/${file}`);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 160 || metadata.height !== 160 || !metadata.hasAlpha || bytes.length > specification.max_bytes)
    throw new Error(`Illustration size/transparency invalid: ${spec.id}`);
  const image = { ...spec, file, path: `/project-illustrations/${file}`, width: 160, height: 160,
    bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  await save(`${root}/${spec.id}.json`, JSON.stringify(image, null, 2) + "\n");
  images.push(image);
}
const index = { version: 2, style: specification.style, format: "webp", curriculum_version: specification.curriculum_version, images };
await save(`${root}/index.json`, JSON.stringify(index, null, 2) + "\n");
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
await save(`${root}/catalog.html`, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ilustraciones para Mi año</title><style>body{margin:0;background:#fffdf9;color:#244a50;font:16px/1.5 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:32px 20px}h1{font-size:28px;margin:0 0 8px}p{margin:0 0 28px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:24px 16px}figure{margin:0;text-align:center;padding:12px 0}img{width:96px;height:96px;object-fit:contain}figcaption{font-size:14px;font-weight:600;margin-top:8px}a{color:#087d96}small{display:block;font-weight:400}footer{margin-top:32px}</style><main><h1>Ilustraciones para Mi año</h1><p>${images.length} dibujos · Estilo infantil cálido y sencillo · Fondo transparente</p><section>${images.map(item => `<figure><img src="${item.file}" width="160" height="160" alt="${escape(item.title)}"><figcaption>${escape(item.title)}<small><a href="${item.id}.json">JSON</a> · ${(item.bytes / 1024).toFixed(1)} KB</small></figcaption></figure>`).join("")}</section><footer><a href="index.json">Catálogo JSON completo</a></footer></main></html>`);
console.log(JSON.stringify({ images: images.length, totalBytes: images.reduce((sum, image) => sum + image.bytes, 0), maxBytes: Math.max(...images.map(image => image.bytes)) }));

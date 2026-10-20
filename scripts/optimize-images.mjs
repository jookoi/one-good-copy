// Turns the raw screenshots in _jookoi-raw-screenshots (gitignored, never commit them) into responsive avif + webp files in src/img.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const sourceFolder = "_jookoi-raw-screenshots";
const outputFolder = "src/img";
const widths = [480, 960, 1600, 2400];

const screenshots = {
  // Copies of the app repo's docs/screenshots (captures of 2026-10-20), renamed.
  "app-overview": "app-overview.png",
  "app-space": "app-space.png",
  "app-compare": "app-compare.png",
  "app-compare-differences": "app-compare-differences.png",
  "app-photo-family": "app-photo-family.png",
  "app-files": "app-files.png",
  "app-scan-whole-pc": "app-scan-whole-pc.png",
  "app-photo-preview": "app-photo-preview.png",
};

// Cut after redaction, in source pixels.
const crops = {
  // Whole-PC scan: the summary figures only. The per-drive rows below hold the owner's name.
  "app-scan-whole-pc": { left: 300, top: 225, width: 2160, height: 470 },
};

// Boxes painted over before encoding, in source pixels. The fill is sampled from `fillFrom`, a spot of plain background.
const redactions = {
  "app-compare-differences": {
    fillFrom: { left: 1200, top: 1262 },
    boxes: [{ left: 638, top: 1255, width: 58, height: 28 }], // user folder name in a C:\Users path
  },
};

async function sourceWithRedactions(name, file) {
  const path = `${sourceFolder}/${file}`;
  const redaction = redactions[name];
  const crop = crops[name];
  const finish = (image) => (crop ? image.extract(crop) : image).png().toBuffer();
  if (!redaction) return finish(sharp(path));
  const { data } = await sharp(path)
    .extract({ ...redaction.fillFrom, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [red, green, blue] = data;
  const patches = redaction.boxes.map(({ width, height, left, top }) => ({
    input: { create: { width, height, channels: 3, background: { r: red, g: green, b: blue } } },
    left,
    top,
  }));
  return finish(sharp(await sharp(path).composite(patches).png().toBuffer()));
}

mkdirSync(outputFolder, { recursive: true });

for (const [name, file] of Object.entries(screenshots)) {
  const original = await sourceWithRedactions(name, file);
  const { width, height } = await sharp(original).metadata();
  const targetWidths = [...widths.filter((w) => w < width * 0.95), width];
  console.log(`${name}: ${width}x${height}, widths ${targetWidths.join(" ")}`);
  for (const targetWidth of targetWidths) {
    const resized = () => sharp(original).resize({ width: targetWidth });
    await resized().avif({ quality: 55, effort: 6 }).toFile(`${outputFolder}/${name}-${targetWidth}.avif`);
    await resized().webp({ quality: 78 }).toFile(`${outputFolder}/${name}-${targetWidth}.webp`);
  }
}

// Turns the raw screenshots in _jookoi-raw-screenshots (gitignored, never commit them) into responsive avif + webp files in src/img.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const sourceFolder = "_jookoi-raw-screenshots";
const outputFolder = "src/img";
const widths = [480, 960, 1600, 2400];

const screenshots = {
  "scans-page": "Screenshot 2026-10-19 021637.png",
  "compare-folders": "Screenshot 2026-10-19 021727.jpg",
  "photo-family": "Screenshot 2026-10-19 034416.png",
  "space-page": "Screenshot 2026-10-19 031816.png",
};

// Boxes painted over before encoding, in source pixels. The fill is sampled from `fillFrom`, a spot of plain background.
const redactions = {
  "compare-folders": {
    fillFrom: { left: 730, top: 2410 },
    boxes: [
      { left: 270, top: 2298, width: 70, height: 28 }, // folder name in the card title
      { left: 358, top: 2344, width: 62, height: 46 }, // the same name cut off in two paths
    ],
  },
};

async function sourceWithRedactions(name, file) {
  const path = `${sourceFolder}/${file}`;
  const redaction = redactions[name];
  if (!redaction) return sharp(path).toBuffer();
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
  return sharp(path).composite(patches).png().toBuffer();
}

mkdirSync(outputFolder, { recursive: true });

for (const [name, file] of Object.entries(screenshots)) {
  const original = await sourceWithRedactions(name, file);
  const { width, height } = await sharp(original).metadata();
  const targetWidths = [...widths.filter((w) => w < width), width];
  console.log(`${name}: ${width}x${height}, widths ${targetWidths.join(" ")}`);
  for (const targetWidth of targetWidths) {
    const resized = () => sharp(original).resize({ width: targetWidth });
    await resized().avif({ quality: 55, effort: 6 }).toFile(`${outputFolder}/${name}-${targetWidth}.avif`);
    await resized().webp({ quality: 78 }).toFile(`${outputFolder}/${name}-${targetWidth}.webp`);
  }
}

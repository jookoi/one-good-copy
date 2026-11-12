// Writes the 1200x630 link-preview cards in public/social/ from the screenshots in src/img.
// Social sites and chat apps do not read AVIF, so the cards are JPEG. Run after `npm run images`; commit the output.
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const outputFolder = "public/social";
const width = 1200;
const height = 630;

// One card per page that has its own screenshot. vite.config.js picks `home` for every other page.
const cards = {
  home: { screenshot: "app-overview-1600.webp", lines: ["Find duplicate folders", "and backups across", "every drive"] },
  folders: { screenshot: "app-compare-1600.webp", lines: ["Which backup is", "complete? Compare", "every copy"] },
  files: { screenshot: "app-files-1600.webp", lines: ["Every file on", "every drive.", "One search box."] },
  photos: { screenshot: "app-photo-family-1600.webp", lines: ["RAW, JPEG and edits", "of one shot,", "grouped"] },
};

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The logo's own markup, scaled into a 64px box.
const logo = readFileSync("src/img/logo.svg", "utf8")
  .replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1076 543 400 400" x="64" y="56" width="64" height="64">');

function textLayer(lines) {
  const headline = lines
    .map((line, index) => `<text x="64" y="${228 + index * 58}" class="headline">${escape(line)}</text>`)
    .join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>
      text { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
      .brand { font-size: 30px; font-weight: 700; fill: #f2f0ea; }
      .headline { font-size: 47px; font-weight: 700; fill: #fff9e9; }
      .note { font-size: 26px; font-weight: 600; fill: #ffb020; }
    </style>
    ${logo}
    <text x="144" y="99" class="brand">One Good Copy</text>
    ${headline}
    <text x="64" y="${228 + lines.length * 58 + 34}" class="note">Free for Windows and Linux</text>
  </svg>`);
}

// Dark page colour with a soft orange glow behind the screenshot.
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><radialGradient id="glow" cx="78%" cy="62%" r="60%"><stop offset="0%" stop-color="#f26a1b" stop-opacity="0.28"/><stop offset="100%" stop-color="#0e0f12" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="#0e0f12"/><rect width="100%" height="100%" fill="url(#glow)"/>
</svg>`);

const shotLeft = 640;
const shotTop = 120;
const shotWidth = 760; // runs off the right edge on purpose

async function screenshotLayer(file) {
  const resized = await sharp(`src/img/${file}`).resize({ width: shotWidth }).png().toBuffer();
  const { height: shotHeight } = await sharp(resized).metadata();
  const visibleHeight = Math.min(shotHeight, height - shotTop);
  const roundedMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${shotWidth}" height="${visibleHeight}"><rect width="${shotWidth}" height="${visibleHeight + 20}" rx="14" fill="#fff"/></svg>`);
  return sharp(resized)
    .extract({ left: 0, top: 0, width: shotWidth, height: visibleHeight })
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

mkdirSync(outputFolder, { recursive: true });

for (const [name, { screenshot, lines }] of Object.entries(cards)) {
  const shot = await screenshotLayer(screenshot);
  const visibleWidth = width - shotLeft;
  const croppedShot = await sharp(shot).extract({ left: 0, top: 0, width: visibleWidth, height: (await sharp(shot).metadata()).height }).toBuffer();
  await sharp(background)
    .composite([
      { input: croppedShot, left: shotLeft, top: shotTop },
      { input: textLayer(lines), left: 0, top: 0 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(`${outputFolder}/${name}.jpg`);
  console.log(`${outputFolder}/${name}.jpg`);
}

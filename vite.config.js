import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

// Each page: its source file, its URL, and whether it shows in the header nav.
const pages = [
  { file: "index.html", url: "/", label: "Home", inNav: true },
  { file: "folders/index.html", url: "/folders/", label: "Folders", inNav: true },
  { file: "files/index.html", url: "/files/", label: "Files", inNav: true },
  { file: "photos/index.html", url: "/photos/", label: "Photos", inNav: true },
  { file: "safety/index.html", url: "/safety/", label: "Safety", inNav: true },
  { file: "about/index.html", url: "/about/", label: "About", inNav: true },
  { file: "privacy/index.html", url: "/privacy/", label: "Privacy" },
];

function pageLink(page, currentUrl, attributes = "") {
  const current = page.url === currentUrl ? ' aria-current="page"' : "";
  return `<a href="${page.url}"${current}${attributes}>${page.label}</a>`;
}

// The logo is inlined, not an <img>, so CSS can move its three sheets apart on hover.
// The first three paths are the sheets; the fold and checkmark ride with the orange one.
const logoMark = (() => {
  const source = readFileSync(resolve(import.meta.dirname, "src/img/logo.svg"), "utf8");
  const defs = source.match(/<defs>[\s\S]*?<\/defs>/)[0];
  const [cream, gold, ...front] = source.match(/<path[^>]*>(?:<\/path>)?/g);
  return `<svg class="brand-mark" viewBox="1076 543 400 400" width="52" height="52" aria-hidden="true" focusable="false">${defs}<g class="logo-sheet logo-cream">${cream}</g><g class="logo-sheet logo-gold">${gold}</g><g class="logo-sheet logo-front">${front.join("")}</g></svg>`;
})();

function siteHeader(currentUrl) {
  const navLinks = pages.filter((page) => page.inNav).map((page) => pageLink(page, currentUrl));
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="wrap site-header">
    <a class="brand" href="/"${currentUrl === "/" ? ' aria-current="page"' : ""}>
      ${logoMark}
      One Good Copy
    </a>
    <nav class="site-nav" aria-label="Main">
      ${navLinks.join("\n      ")}
      <a class="button button-small" href="{{site.storeUrl}}">Download</a>
    </nav>
  </header>`;
}

function siteFooter(currentUrl) {
  const footerLinks = pages.filter((page) => page.label).map((page) => pageLink(page, currentUrl));
  return `<footer class="wrap site-footer">
    <nav aria-label="Footer">
      ${footerLinks.join("\n      ")}
    </nav>
  </footer>`;
}

// Facts about the app itself. Shown on Safety and Privacy, written once so the two cannot disagree.
const appFacts = `<div class="deal">
        <h2 id="app-heading">The app</h2>
        <ul>
          <li>Has no network code. It works with the network blocked.</li>
          <li>Keeps your file list in one database on your PC. Empty it with Delete database on the Scans page.</li>
          <li>Writes its logs next to that database. They never leave your PC.</li>
          <li>Installs and updates through the Microsoft Store, under Microsoft's privacy policy.</li>
        </ul>
      </div>`;

// Swaps <!-- site-header -->, <!-- site-footer --> and <!-- app-facts --> for the shared markup, marking the current page.
function sharedLayout() {
  return {
    name: "shared-layout",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const currentUrl = context.path.replace(/index\.html$/, "");
        return html
          .replace("<!-- site-header -->", siteHeader(currentUrl))
          .replace("<!-- site-footer -->", siteFooter(currentUrl))
          .replace("<!-- app-facts -->", appFacts);
      },
    },
  };
}

// Sizes in binary units with Windows labels, so they match what Explorer shows.
function formatBytes(bytes) {
  const tebibyte = 1024 ** 4;
  if (bytes >= tebibyte) return `${(bytes / tebibyte).toFixed(1)} TB`;
  return `${Math.round(bytes / 1024 ** 3)} GB`;
}

function formatFileCount(files) {
  if (files >= 1_000_000) return `${(files / 1_000_000).toFixed(2).replace(/0$/, "")} M`;
  return `${Math.round(files / 1000)} k`;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

function speedRow({ label, bytes, files, listedMs, fullScanMs }, rowClass = "") {
  // data-label names the column when a phone stacks each row into a block.
  const fullScan = fullScanMs
    ? `<td class="time first-scan" data-label="Full first scan">${formatDuration(fullScanMs)}</td>`
    : `<td class="not-timed" data-label="Full first scan">not timed alone</td>`;
  return `<tr${rowClass}>
              <td>${label}</td>
              <td data-label="Data on it">${formatBytes(bytes)}</td>
              <td data-label="Files">${formatFileCount(files)}</td>
              <td class="time" data-label="Listed in">${formatDuration(listedMs)}</td>
              ${fullScan}
            </tr>`;
}

function speedTable(benchmarks) {
  const rows = benchmarks.drives.map((drive) => speedRow({ ...drive, fullScanMs: drive.fullScanAlone?.ms }));
  rows.push(speedRow(benchmarks.wholePc, ' class="total"'));
  return `<table class="speed-table">
          <caption class="visually-hidden">Scan times on the developer's PC, ${benchmarks.measuredOn}</caption>
          <thead>
            <tr>
              <th scope="col">Drive</th>
              <th scope="col">Data on it</th>
              <th scope="col">Files</th>
              <th scope="col">Listed in</th>
              <th scope="col">Full first scan</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join("\n            ")}
          </tbody>
        </table>`;
}

// Fills <!-- speed-table --> and {{facts.name}} from benchmarks/scan-speeds.json. A missing fact fails the build.
function benchmarkNumbers() {
  const benchmarksFile = resolve(import.meta.dirname, "benchmarks/scan-speeds.json");
  return {
    name: "benchmark-numbers",
    configureServer(server) {
      server.watcher.add(benchmarksFile);
      server.watcher.on("change", (file) => {
        if (resolve(file) === benchmarksFile) server.ws.send({ type: "full-reload" });
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const benchmarks = JSON.parse(readFileSync(benchmarksFile, "utf8"));
        benchmarks.facts.wholePcFiles = `${(benchmarks.wholePc.files / 1_000_000).toFixed(1)} million`;
        benchmarks.facts.wholePcListedIn = `${Math.round(benchmarks.wholePc.listedMs / 60_000)} minutes`;
        benchmarks.facts.wholePcDrives = String(benchmarks.wholePc.label.match(/\d+/)[0]);
        benchmarks.facts.wholePcData = formatBytes(benchmarks.wholePc.bytes);
        return html
          .replace("<!-- speed-table -->", speedTable(benchmarks))
          .replace(/\{\{facts\.(\w+)\}\}/g, (token, name) => {
            if (!(name in benchmarks.facts)) throw new Error(`benchmarks/scan-speeds.json has no facts.${name}`);
            return benchmarks.facts[name];
          });
      },
    },
  };
}

// Fills {{site.name}} from site.json (contact address, Store link). A missing key fails the build.
function siteSettings() {
  const settingsFile = resolve(import.meta.dirname, "site.json");
  return {
    name: "site-settings",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
        return html.replace(/\{\{site\.(\w+)\}\}/g, (token, name) => {
          if (!(name in settings)) throw new Error(`site.json has no ${name}`);
          return settings[name];
        });
      },
    },
  };
}

// Preloads the two latin variable fonts the first screen uses, so text paints in its final font.
function preloadCriticalFonts() {
  return {
    name: "preload-critical-fonts",
    transformIndexHtml: {
      order: "post",
      handler(html, context) {
        if (!context.bundle) return html;
        const links = Object.keys(context.bundle)
          .filter((file) => /(figtree|schibsted-grotesk)-latin-wght-normal.*\.woff2$/.test(file))
          .map((file) => `<link rel="preload" href="/${file}" as="font" type="font/woff2" crossorigin>`)
          .join("\n  ");
        return html.replace("</head>", `  ${links}\n</head>`);
      },
    },
  };
}

export default defineConfig({
  plugins: [sharedLayout(), siteSettings(), benchmarkNumbers(), preloadCriticalFonts()],
  build: {
    target: "es2022",
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.label?.toLowerCase() ?? "home", resolve(import.meta.dirname, page.file)])),
    },
  },
});

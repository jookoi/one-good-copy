import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Each page: its source file, its URL, and whether it shows in the header nav.
// `socialCard` names its link-preview image in public/social/ (default `home`, see scripts/make-social-cards.mjs).
const pages = [
  { file: "index.html", url: "/", label: "Home", inNav: true },
  { file: "folders/index.html", url: "/folders/", label: "Folders", inNav: true, socialCard: "folders" },
  { file: "files/index.html", url: "/files/", label: "Files", inNav: true, socialCard: "files" },
  { file: "photos/index.html", url: "/photos/", label: "Photos", inNav: true, socialCard: "photos" },
  { file: "safety/index.html", url: "/safety/", label: "Safety", inNav: true },
  { file: "about/index.html", url: "/about/", label: "About", inNav: true },
  { file: "privacy/index.html", url: "/privacy/", label: "Privacy" },
  { file: "licenses/index.html", url: "/licenses/", label: "Licenses" },
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
      <span class="nav-downloads"><a class="button button-small" href="{{site.storeUrl}}">Windows</a><a class="button button-small" href="{{site.snapUrl}}">Linux</a></span>
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

const benchmarksFile = resolve(import.meta.dirname, "benchmarks/scan-speeds.json");
const settingsFile = resolve(import.meta.dirname, "site.json");

// benchmarks/scan-speeds.json plus the facts derived from its whole-PC row.
function readBenchmarks() {
  const benchmarks = JSON.parse(readFileSync(benchmarksFile, "utf8"));
  benchmarks.facts.wholePcFiles = `${(benchmarks.wholePc.files / 1_000_000).toFixed(1)} million`;
  benchmarks.facts.wholePcListedIn = `${Math.round(benchmarks.wholePc.listedMs / 60_000)} minutes`;
  benchmarks.facts.wholePcDrives = String(benchmarks.wholePc.label.match(/\d+/)[0]);
  benchmarks.facts.wholePcData = formatBytes(benchmarks.wholePc.bytes);
  return benchmarks;
}

function readSettings() {
  return JSON.parse(readFileSync(settingsFile, "utf8"));
}

// Swaps {{facts.x}} and {{site.x}}. A missing name fails the build.
function fillFacts(text, facts) {
  return text.replace(/\{\{facts\.(\w+)\}\}/g, (token, name) => {
    if (!(name in facts)) throw new Error(`benchmarks/scan-speeds.json has no facts.${name}`);
    return facts[name];
  });
}

function fillSettings(text, settings) {
  return text.replace(/\{\{site\.(\w+)\}\}/g, (token, name) => {
    if (!(name in settings)) throw new Error(`site.json has no ${name}`);
    return settings[name];
  });
}

// Fills <!-- speed-table --> and {{facts.name}} from benchmarks/scan-speeds.json. A missing fact fails the build.
function benchmarkNumbers() {
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
        const benchmarks = readBenchmarks();
        return fillFacts(html.replace("<!-- speed-table -->", speedTable(benchmarks)), benchmarks.facts);
      },
    },
  };
}

// Fills {{site.name}} from site.json (contact address, Store link). A missing key fails the build.
function siteSettings() {
  return {
    name: "site-settings",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return fillSettings(html, readSettings());
      },
    },
  };
}

// What search engines, chat apps and AI assistants read about each page: canonical URL, link preview
// (Open Graph, X card) and schema.org JSON-LD. Title and description come from the page's own tags.
function searchAndSharing() {
  const escapeAttribute = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return {
    name: "search-and-sharing",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const settings = readSettings();
        const currentUrl = context.path.replace(/index\.html$/, "");
        const page = pages.find((candidate) => candidate.url === currentUrl);
        if (!page) throw new Error(`${context.path} is not in the pages list in vite.config.js`);
        const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
        const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
        if (!title || !description) throw new Error(`${page.file} needs a <title> and a meta description`);

        const pageUrl = new URL(page.url, settings.siteUrl).href;
        const imageUrl = new URL(`/social/${page.socialCard ?? "home"}.jpg`, settings.siteUrl).href;
        const tags = [
          `<link rel="canonical" href="${pageUrl}">`,
          `<meta name="robots" content="index, follow, max-image-preview:large">`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:site_name" content="One Good Copy">`,
          `<meta property="og:locale" content="en">`,
          `<meta property="og:url" content="${pageUrl}">`,
          `<meta property="og:title" content="${title}">`,
          `<meta property="og:description" content="${description}">`,
          `<meta property="og:image" content="${imageUrl}">`,
          `<meta property="og:image:width" content="1200">`,
          `<meta property="og:image:height" content="630">`,
          `<meta property="og:image:alt" content="${escapeAttribute(`One Good Copy: ${page.label === "Home" ? "duplicate folder finder" : page.label}`)}">`,
          `<meta name="twitter:card" content="summary_large_image">`,
          `<link rel="alternate" type="text/plain" title="Summary for AI assistants" href="/llms.txt">`,
          `<script type="application/ld+json">${JSON.stringify(structuredData(page, pageUrl, imageUrl, settings))}</script>`,
        ];
        return html.replace("</head>", `  ${tags.join("\n  ")}\n</head>`);
      },
    },
  };
}

// schema.org graph. Home describes the app itself, other pages point at it and carry a breadcrumb.
function structuredData(page, pageUrl, imageUrl, settings) {
  const siteUrl = new URL("/", settings.siteUrl).href;
  const ids = { website: `${siteUrl}#website`, publisher: `${siteUrl}#publisher`, app: `${siteUrl}#app` };
  const webPage = {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    isPartOf: { "@id": ids.website },
    about: { "@id": ids.app },
    primaryImageOfPage: imageUrl,
    inLanguage: "en",
  };
  if (page.url !== "/") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        webPage,
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "One Good Copy", item: siteUrl },
            { "@type": "ListItem", position: 2, name: page.label, item: pageUrl },
          ],
        },
      ],
    };
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      webPage,
      { "@type": "WebSite", "@id": ids.website, url: siteUrl, name: "One Good Copy", publisher: { "@id": ids.publisher }, inLanguage: "en" },
      {
        "@type": "Organization",
        "@id": ids.publisher,
        name: "One Good Copy",
        url: siteUrl,
        logo: new URL("/favicon.svg", siteUrl).href,
        email: settings.contactEmail,
        sameAs: [settings.coffeeUrl],
      },
      {
        "@type": "SoftwareApplication",
        "@id": ids.app,
        name: "One Good Copy",
        url: siteUrl,
        description: settings.appDescription,
        applicationCategory: "UtilitiesApplication",
        applicationSubCategory: "Duplicate file finder and disk space analyzer",
        operatingSystem: "Windows, Linux",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        downloadUrl: [settings.storeUrl, settings.snapUrl, settings.windowsZipUrl],
        installUrl: settings.storeUrl,
        screenshot: imageUrl,
        image: imageUrl,
        featureList: settings.appFeatures,
        publisher: { "@id": ids.publisher },
        sameAs: [settings.storeUrl, settings.snapUrl],
      },
    ],
  };
}

// Last commit date of a file, for sitemap <lastmod>. CI needs full history (fetch-depth: 0) for this to be right.
function lastCommitDate(file) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: import.meta.dirname, encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

// Writes sitemap.xml from the pages list and llms.txt (the plain-text summary for AI assistants) from src/llms.txt.
function crawlerFiles() {
  return {
    name: "crawler-files",
    apply: "build",
    generateBundle() {
      const settings = readSettings();
      const urls = pages.map((page) => {
        const lastModified = lastCommitDate(page.file);
        const lastModifiedTag = lastModified ? `<lastmod>${lastModified}</lastmod>` : "";
        return `  <url><loc>${new URL(page.url, settings.siteUrl).href}</loc>${lastModifiedTag}</url>`;
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
      });
      const llmsTemplate = readFileSync(resolve(import.meta.dirname, "src/llms.txt"), "utf8");
      this.emitFile({ type: "asset", fileName: "llms.txt", source: fillSettings(fillFacts(llmsTemplate, readBenchmarks().facts), settings) });
    },
  };
}

// Fills <!-- third-party-packages --> with a table of the packages in public/third-party-notices.txt.
// That file is a copy of the app's notices (npm run licenses), so the page lists exactly what the app ships.
function thirdPartyPackages() {
  const noticesFile = resolve(import.meta.dirname, "public/third-party-notices.txt");
  const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return {
    name: "third-party-packages",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!html.includes("<!-- third-party-packages -->")) return html;
        const packageSection = readFileSync(noticesFile, "utf8").split(/^=+$/m)[2];
        const rows = packageSection
          .split(/\r?\n/)
          .map((line) => line.split(" | "))
          // "name version | licence | link"; a few packages have no link.
          .filter((parts) => (parts.length === 2 || parts.length === 3) && /^\S+ \S+$/.test(parts[0].trim()))
          .map(([nameAndVersion, licence, link]) => {
            const [name, version] = nameAndVersion.trim().split(" ");
            const nameCell = link ? `<a href="${escape(link.trim())}">${escape(name)}</a>` : escape(name);
            return `<tr><td>${nameCell}</td><td>${escape(version)}</td><td>${escape(licence.trim())}</td></tr>`;
          });
        if (rows.length === 0) throw new Error("public/third-party-notices.txt has no package lines");
        return html
          .replace("{{licences.packageCount}}", String(rows.length))
          .replace("<!-- third-party-packages -->", `<table class="licence-table">
          <thead><tr><th scope="col">Package</th><th scope="col">Version</th><th scope="col">Licence</th></tr></thead>
          <tbody>
            ${rows.join("\n            ")}
          </tbody>
        </table>`);
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

// Counts page visits with the self-hosted Plausible instance. Cookieless, no personal data stored.
function plausibleAnalytics() {
  const snippet = `<script async src="https://thezoo.jookoi.com/js/pa-S5ATvh23ZjqOPxASJyRg1.js"></script>
  <script>
    window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
    plausible.init()
  </script>`;
  return {
    name: "plausible-analytics",
    transformIndexHtml(html) {
      return html.replace("</head>", `  ${snippet}\n</head>`);
    },
  };
}

export default defineConfig({
  plugins: [sharedLayout(), searchAndSharing(), siteSettings(), benchmarkNumbers(), thirdPartyPackages(), crawlerFiles(), preloadCriticalFonts(), plausibleAnalytics()],
  build: {
    target: "es2022",
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.label?.toLowerCase() ?? "home", resolve(import.meta.dirname, page.file)])),
    },
  },
});

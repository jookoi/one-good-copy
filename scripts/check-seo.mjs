// Checks the built site in dist/ for what search engines and AI assistants need. Fails the build on a gap.
// Runs after `vite build` in `npm run check` and in CI.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distFolder = "dist";
const problems = [];

function htmlFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return entry.name === "assets" ? [] : htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

const sitemap = readFileSync(join(distFolder, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

for (const file of htmlFiles(distFolder)) {
  const html = readFileSync(file, "utf8");
  const report = (problem) => problems.push(`${file}: ${problem}`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? "";
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  const image = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];

  if (!title) report("no <title>");
  else if (title.length > 65) report(`title is ${title.length} characters, search results cut it after about 60`);
  if (!description) report("no meta description");
  else if (description.length > 165) report(`description is ${description.length} characters, keep it under about 160`);
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) report("needs exactly one <h1>");
  if (!canonical) report("no canonical link");
  else if (!sitemapUrls.includes(canonical)) report(`canonical ${canonical} is not in sitemap.xml`);
  if (!image) report("no og:image");
  else if (!existsSync(join(distFolder, new URL(image).pathname))) report(`og:image ${image} is not in dist/`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch {
      report("JSON-LD does not parse");
    }
  }
}

for (const file of ["robots.txt", "llms.txt"]) {
  if (!existsSync(join(distFolder, file))) problems.push(`dist/${file} is missing`);
}
if (/\{\{|\}\}/.test(readFileSync(join(distFolder, "llms.txt"), "utf8"))) problems.push("dist/llms.txt has an unfilled {{placeholder}}");

if (problems.length > 0) {
  console.error(`SEO check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`SEO check passed: ${sitemapUrls.length} pages in sitemap.xml`);

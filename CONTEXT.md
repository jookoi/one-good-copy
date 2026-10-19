# website

Static site for One Good Copy. Vite multi-page build, no client JavaScript. Own `package.json`, separate from the app.

| Command | Does |
|---|---|
| `npm run dev` | local server |
| `npm run build` | `dist/` to deploy |
| `npm run images` | screenshots in `docs/brand/website/assets` to AVIF/WebP in `src/img/` |

- ✅ `npm run check` (ESLint + build) runs on every commit via `.husky/pre-commit`. CI (`.github/workflows/deploy.yml`) lints, builds and deploys `dist/` to GitHub Pages on push to `main`. Pages must be set to Source: GitHub Actions. Links are root-absolute (`/folders/`), so the site must be served from a domain root, not `/one-good-copy/`.
- 🧩 Header and footer are written by `vite.config.js` (`sharedLayout`). Add a page to the `pages` list there, or it is not built and not linked.
- 🔗 `{{site.x}}` comes from `site.json` (Store, Ko-fi, contact). A missing key fails the build.
- 🔢 `<!-- speed-table -->` and `{{facts.x}}` come from `benchmarks/scan-speeds.json`. Never type a number into a page. `benchmarks/README.md` says where each one was measured.
- ✍️ Copy rules: `docs/brand/WEBSITE-STORY.md`.
- ⚠️ The Privacy page states the app has no network code and the site has no scripts or cookies. Adding either makes that page false.

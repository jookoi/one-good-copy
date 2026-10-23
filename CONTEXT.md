# website

Static site for One Good Copy. Vite multi-page build, no client JavaScript. Own `package.json`, separate from the app.

| Command | Does |
|---|---|
| `npm run dev` | local server |
| `npm run build` | `dist/` to deploy |
| `npm run images` | screenshots in `_jookoi-raw-screenshots/` (gitignored) to AVIF/WebP in `src/img/`. Names, crops and name redactions are in `scripts/optimize-images.mjs`. The `app-*` files are copies of the app repo's `docs/screenshots`. |
| `npm run licenses` | copies the app repo's `THIRD-PARTY-NOTICES.txt` to `public/`. The Licenses page lists its packages. Run after the app regenerates it. Set `APP_REPO` if the app repo is not at `../jookoi-disc-report/modernized/jookoi-windows-drive-spring-cleaner`. |

- ✅ `npm run check` (ESLint + build) runs on every commit via `.husky/pre-commit`. CI (`.github/workflows/deploy.yml`) lints, builds and deploys `dist/` to GitHub Pages on push to `main`. Pages must be set to Source: GitHub Actions. Links are root-absolute (`/folders/`), so the site must be served from a domain root, not `/one-good-copy/`.
- 🧩 Header and footer are written by `vite.config.js` (`sharedLayout`). Add a page to the `pages` list there, or it is not built and not linked.
- 🔗 `{{site.x}}` comes from `site.json` (Store, Ko-fi, contact). A missing key fails the build.
- 🔢 `<!-- speed-table -->` and `{{facts.x}}` come from `benchmarks/scan-speeds.json`. Never type a number into a page. `benchmarks/README.md` says where each one was measured.
- 🖼️ Home tells the story (`docs/brand/WEBSITE-STORY.md` in the app repo) over full-size screenshots: hero, three numbered steps, Fast (whole-PC screenshot, stat cards, how, table), the deal, download. Links to other pages stay small, under a screenshot or at the end. Longer explanations live on Folders and Photos.
- 🌑 Dark only, like the app. Colours are tokens on `:root` in `src/main.css`. `theme-color` in every page is `#0e0f12`.
- ✍️ Copy rules: `docs/brand/WEBSITE-STORY.md`.

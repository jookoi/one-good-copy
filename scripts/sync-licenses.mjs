// Copies the app's THIRD-PARTY-NOTICES.txt into public/, where the Licenses page reads it and serves it in full.
// The app repo regenerates that file (scripts/generate-third-party-notices.py there) when its packages change; run this after.
import { copyFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const appRepository = process.env.APP_REPO ?? resolve(import.meta.dirname, "../../jookoi-disc-report/modernized/jookoi-windows-drive-spring-cleaner");
const source = resolve(appRepository, "THIRD-PARTY-NOTICES.txt");
const target = resolve(import.meta.dirname, "../public/third-party-notices.txt");

copyFileSync(source, target);
console.log(`${source} -> public/third-party-notices.txt (${Math.round(statSync(target).size / 1024)} KB)`);

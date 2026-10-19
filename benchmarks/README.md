# Benchmarks

Every speed number on the website comes from `scan-speeds.json`. The build reads it, so change it here and rebuild. Never type a number into the HTML.

## What feeds what

| JSON | Where it shows |
|---|---|
| `drives[]`, `wholePc` | Home, "How fast?" table |
| `wholePc.files`, `wholePc.listedMs` | Home, "Fast, on every drive" card (built as `facts.wholePcFiles`, `facts.wholePcListedIn`, `facts.wholePcDrives`) |
| `facts.contentReadGb`, `facts.driveSizeGb` | Not used right now |
| `facts.photo*`, `facts.oneFamilyExtraCopies` | Photos, the three stat cards |

In HTML a fact is `{{facts.<name>}}`. The table goes where `<!-- speed-table -->` sits.

## What the columns mean

- 📂 **Listed in**: time to list every folder and file on that drive. Taken from the whole-PC run, with all drives read at once.
- ⏱️ **Full first scan**: listing, photo details, fingerprints and grouping, until "Scan complete". Only for drives timed on their own (`fullScanAlone`). `null` shows as "not timed alone".
- 🖥️ **Whole PC**: listed in = the slowest drive's lane. Full first scan = the whole run's `total_ms`.

> [!WARNING]
> A timing is only fair from a release build, on a full refresh. An update scan skips unchanged folders and says nothing about speed.

## Add or replace a run

1. Run a full refresh from a release build.
2. Find its line in `_jookoi-data/logs/scan-timing.jsonl` (`started_unix`).
3. Copy `walks[].files`, `walks[].bytes`, `walks[].ms` and `total_ms` into the JSON. Keep `startedUnix` so the number can be traced.
4. Rebuild the site.

💡 Pick the slowest of comparable runs. A second run soon after the first reads from the Windows cache and is not a first scan. The SATA SSD has runs of 3:27, 2:49, 1:48 and 0:46 on 16 to 17 October 2026. The table uses 2:49, the slowest run on 17 October.

## Still to measure

- ⏱️ C: (NVMe) and A: (16 TB hard drive) full scans on their own: Scans page, Full refresh, one drive per run, after a restart so the cache is cold.
- 🔁 A rescan with nothing changed, timed to "Scan complete". Rescans also redo grouping across the whole catalog, so expect minutes, not seconds.

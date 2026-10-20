# Benchmarks

Every speed number on the website comes from `scan-speeds.json`. The build reads it, so change it here and rebuild. Never type a number into the HTML.

## What feeds what

| JSON | Where it shows |
|---|---|
| `drives[]`, `wholePc` | Home, speed table under "Fast" |
| `wholePc.files`, `wholePc.listedMs`, `wholePc.bytes` | Built as `facts.wholePcFiles`, `facts.wholePcListedIn`, `facts.wholePcDrives`, `facts.wholePcData`. Home stat card, Photos, About |
| `facts.contentReadGb`, `facts.driveDataGb`, `facts.contentReadShare` | Home stat card and the "hashes every file in full" line |
| `facts.photosPerSecondSsd` | Home and Photos stat cards |
| `facts.wholePc*` | Photos stat cards |

In HTML a fact is `{{facts.<name>}}`. The table goes where `<!-- speed-table -->` sits. `factSources` says where each fact was read.

## The runs

Both on 20 October 2026, release build, database deleted right before, so the catalog was empty and every file was listed, read and fingerprinted.

| Run | `startedUnix` | On screen | In the log |
|---|---|---|---|
| SATA SSD alone | 1792454614 | 0:42, listing 0:18 | 37.2 s, walk 16.0 s |
| Whole PC, 9 drives | 1792454981 | 47:45, listing 5:10 | 47:35 |

The site uses the on-screen figures, so the numbers match the screenshots next to them. The log figures sit next to them in the JSON (`logTotalMs`, `logListedMs`).

The Windows file cache was warm for the SATA SSD (it was scanned minutes before), so 0:42 is a best case. The whole-PC run followed it, so the cache was warm for that drive only. Earlier full runs: 56:08 (17 October), SATA SSD alone 3:27, 2:49, 1:48 and 0:46 (16 to 17 October).

## What the columns mean

- 📂 **Listed in**: time to list every folder and file on that drive. Whole-PC run, all drives read at once. The SATA SSD row is its own run.
- ⏱️ **Full first scan**: listing, photo details, fingerprints and grouping, until "Scan complete". Only for drives timed on their own (`fullScanAlone`). `null` shows as "not timed alone".
- 🖥️ **Whole PC**: listed in = the Listing files step. Full first scan = the whole run.

> [!WARNING]
> A timing is only fair from a release build with an empty catalog (Delete database first). An update scan skips unchanged folders and says nothing about first-scan speed.

## Add or replace a run

1. Delete the database, then scan from a release build.
2. Find its line in `_jookoi-data/logs/scan-timing.jsonl` (`started_unix`). Check every walk has `folders_skipped_unchanged: 0`.
3. Copy files, bytes and times into the JSON, plus what the Scans page showed. Keep `startedUnix`.
4. Rebuild the site.

## Still to measure

- ⏱️ C: (NVMe) and A: (16 TB hard drive) on their own. Needs a deleted database, so only when the owner chooses to.
- 🔁 A rescan with nothing changed, timed to "Scan complete".
- ⚖️ A fair, published comparison with another tool (same drive, same machine, settings written down). Until then the site compares by method ("hashes every file in full"), never by name.

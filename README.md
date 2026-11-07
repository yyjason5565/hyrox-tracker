# RaceForge

HYROX training tracker for Men’s and Women’s Singles Open. The public site stays [https://yyjason5565.github.io/hyrox-tracker/](https://yyjason5565.github.io/hyrox-tracker/). Each person’s results stay in the browser on that device. There is no account and no server.

Logs saved under the earlier name remain on the device. The browser storage key is still `lane-ledger.device.v1`, and backup files still use the format `lane-ledger-backup`, so older downloads import without a rename.

Only Men’s Singles Open and Women’s Singles Open are included. Pro, doubles, relay, mixed, and age-group categories are not.

This is the same idea as a personal health log kept on one phone: opening the link on another device starts empty. Clearing the browser’s site data deletes the log unless a JSON backup was saved.

An optional passphrase is only a local screen lock. It is a salted SHA-256 digest. It does not encrypt the sessions, it is not an online login, and a forgotten passphrase cannot be recovered.

The unrelated site [HealthLog](https://yyjason5565.github.io/healthlog/) is a different app. Do not deploy this tracker into that repository.

## Develop

Node.js 22 or newer.

```bash
npm install
npm test
npm run dev
```

`npm run dev` serves the static-export source with Next’s dev server so the screens can be checked. The data still lives in the browser’s `localStorage`.

## Static build

```bash
npm test
BASE_PATH= npm run build
```

The site is written to `out/`. `BASE_PATH` must match the URL prefix. Leave it empty when the site is served from the domain root. For a GitHub project site it is `/repository-name`.

```bash
npm run zip:pages
```

That writes `lane-ledger-pages.zip`: a root-base static build (`BASE_PATH` empty) plus `.nojekyll`, so GitHub Pages will not hide the `_next` files. Serve the zip’s contents from the root of a static host. It is not a published URL.

## What this tracker does

- Each profile and each session stores Men’s Singles Open or Women’s Singles Open. Official 2026/27 loads come from the [singles rulebook](https://maintain.hyrox.com/rulebooks/HYROX_RulebookSingles_EN.pdf). New people choose their own category. A week, body mass, and goal stay empty until that person sets them.
- Official full-race bests are separate for each category. A result counts only when every run and station is timed at that category’s distances, reps, and loads, and Roxzone/transitions and penalties are entered. `0:00` means none were measured. A blank is not zero. The full elapsed time is the sum of the 16 splits plus those extras. A stopwatch, if you enter one, is shown beside that sum and is not the best.
- Station comparison uses the label “Published multi-venue sample median (2025/26)” from [this independent sample](https://userivo.app/guides/hyrox-station-times). It is not an official world average. Men Open sample 174,215. Women Open sample 98,478. Custom and shortened work is not turned into a race split, and the two categories are not compared with each other.
- Daily suggestions follow the week you save. They do not add a hard station block on top of an easy, recovery, or strength day. Fuel notes are general education with source links, not a diet or a calorie plan.
- Older logs that have no category were Men’s Singles Open, which was the only category at the time. Those sessions are kept. You can change a session’s category when you edit it.

## GitHub Pages

The live site is [https://yyjason5565.github.io/hyrox-tracker/](https://yyjason5565.github.io/hyrox-tracker/). Pages publishes the `docs/` folder on `main`. That is the only publishing source.

`docs/` is a static build with `BASE_PATH=/hyrox-tracker` and a `.nojekyll` file. It contains the site only: no training records and no passphrases.

```bash
BASE_PATH=/hyrox-tracker npm run build
rm -rf docs
cp -a out/. docs/
touch docs/.nojekyll
```

`.github/workflows/pages.yml` runs tests and the same static build. It does not deploy. A second deploy from Actions would compete with the `main` / `docs` source. The workflow refuses to run in a repository named `healthlog`. Do not deploy this project to the HealthLog repository.

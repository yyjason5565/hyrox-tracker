# Lane Ledger

A static training log for men’s open singles sessions. Each person’s results stay in the browser on that device. There is no account, no server, and no sync.

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

## GitHub Pages

The authorized repository is [yyjason5565/hyrox-tracker](https://github.com/yyjason5565/hyrox-tracker). Do not deploy this project to the HealthLog repository.

`docs/` on `main` is a static build with `BASE_PATH=/hyrox-tracker` and a `.nojekyll` file. It contains the site only: no training records and no passphrases.

After that branch is pushed, enable Pages from the `main` branch, folder `/docs`:

```bash
gh api --method POST repos/yyjason5565/hyrox-tracker/pages \
  -f "source[branch]=main" \
  -f "source[path]=/docs"
```

The public site is then `https://yyjason5565.github.io/hyrox-tracker/`.

`.github/workflows/pages.yml` can build and deploy from Actions instead. Use one Pages source, not both. The workflow refuses to run in a repository named `healthlog`.

# Release and deployment

I publish the study from [globalanomalyindex/jellybox](https://github.com/globalanomalyindex/jellybox). GitHub Actions validates the source and deploys the static site to GitHub Pages. The React archive is attached to GitHub Releases; it is not published to npm.

## Build

Use Node 24 and the committed lockfile:

```sh
npm ci
npm run check
npm run pack:library
npm run check:package
```

The site is `dist/`. The component archive and `SHA256SUMS` are generated in ignored `release/`.

For the published project path:

```sh
VITE_BASE_PATH=/jellybox/ npm run build
VITE_BASE_PATH=/jellybox/ npm run preview
```

A build without that setting uses `/`. Verify the logo, lazy panel chunk, story links and optional font stylesheet at the chosen path.

## GitHub Pages

`.github/workflows/pages.yml` checks pushes and pull requests with installation, tests, types, build, package/source checks and a dependency audit. A separate trusted-main job builds with `/jellybox/`, uploads `dist/` and deploys. Actions are pinned by commit; deployment uses short-lived contents-read, pages-write and id-token-write permissions.

The Pages source is GitHub Actions. A push to main or manual workflow run deploys after validation. Check both the workflow conclusion and the actual live page.

## Optional font

My live deployment uses separately licensed Dessign Maison. Public builds use the system fallback. An owner with appropriate web-use rights can configure their own font with:

```sh
node scripts/configure-font.mjs owner/repo /path/to/licensed.otf
```

Only the trusted deployment receives the three font secrets. Generated font files remain ignored and excluded from the component archive. See [assets](ASSETS.md).

## Release checklist

1. Update root/package versions and the lockfile together, then update `CHANGELOG.md` and current install links.
2. Run the checks above, stage the intended files and run `npm run check:release`.
3. Inspect/install the archive in a separate consumer and test affected native browser states.
4. Commit with the intended GitHub account identity, push main and verify CI/Pages.
5. Tag the checked commit. Publish the matching archive and checksum with first-person release notes summarizing the change, validation and limits.

Keep licensed fonts, credentials, generated builds, recordings and local authoring-tool setup out of Git. Preserve dependency notices and source asset rights.

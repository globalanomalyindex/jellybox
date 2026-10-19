# Release and deployment

## Reproduce

Use Node 24 LTS and the committed npm lockfile.

```sh
npm ci
npm run check
npm run pack:library
```

The static website is `dist/client`; the component archive and SHA256SUMS are in ignored `release/`. The optional Sites adapter additionally creates `dist/server/index.js` and `dist/.openai/hosting.json`. GitHub Pages only uploads the static client.

For a project subpath:

```sh
VITE_BASE_PATH=/jellybox/ npm run build
VITE_BASE_PATH=/jellybox/ npm run preview
```

Verify the `/jellybox/` page, logo, dynamic panel chunk, story fragments and optional story-font stylesheet before publishing. A different repository can set its own base path. Hash navigation needs no server rewrite.

## GitHub Pages

`.github/workflows/pages.yml` validates pull requests/pushes with `npm ci`, tests, build, package checks and source hygiene. A separate trusted-main job rebuilds with `/jellybox/`, uploads the static artifact and deploys to Pages. Official actions are pinned by commit. Deploy only receives contents-read, pages-write and id-token-write. No npm credential is required.

The repository Pages source is GitHub Actions. A push to main or manual workflow run deploys after validation. Check the workflow conclusion and real site; a successful upload alone is not evidence of a working page.

## Optional licensed font

Public clones and pull-request checks use the system fallback. The owner can configure their separately licensed web font with authenticated GitHub CLI:

```sh
node scripts/configure-font.mjs owner/repo /path/to/licensed.otf
```

This sets STORY_FONT_PART_1/2/3 secrets. Only the trusted deployment build uses them. Generated font assets are ignored and never enter the reusable archive. See ASSETS.md.

## Cut a version

1. Update root/package versions together, add release notes and run the checks above.
2. Stage intended source and run `npm run check:release`. Inspect the package file list and install it in a separate consumer.
3. Commit, push main, and verify CI/Pages plus native live controls.
4. Tag the checked commit and publish the archive/checksum through GitHub Releases.

```sh
git tag v0.5.15
git push origin v0.5.15
gh release create v0.5.15 release/jellybox-react-0.5.15.tgz release/SHA256SUMS --verify-tag --title 'JellyBox v0.5.15' --notes-file docs/releases/v0.5.15.md
```

Do not add commercial fonts, local scratch/history, machine paths, credentials, node_modules or generated builds to source. The release check catches common mistakes but does not replace review of asset rights or intended public content.

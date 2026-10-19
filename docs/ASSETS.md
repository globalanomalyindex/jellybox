# Assets and licenses

I release the code and documentation under MIT. Spectral.js 3.0.0 is MIT and retains its complete notice in THIRD_PARTY_NOTICES.md and the component archive. React, React DOM, Three.js and Phosphor retain their upstream licenses through their dependencies.

## Identity

`public/brand/jellybox-logo.svg` is the editable solid-black master traced from my original PNG. The PNG and source.json retain its provenance, original proportions, eight connected letters and four counters. The brand files are not included in the component package.

## Optional story font

I hold web-use rights for Dessign Maison, not source redistribution. **No OTF/TTF/WOFF file belongs in this repository or the component archive.** The production site may receive the licensed OTF privately at build time. A clone works without it and uses the existing system-font fallback.

For licensed local use, place your authorized OTF at `.private/story.otf`, or export `JELLYBOX_STORY_FONT` with its path before `npm run dev` / `npm run build`. The preparation script generates ignored `public/story-font.css` and `public/fonts/story.otf`. They are build inputs, not source contributions. If no font is supplied, the generated stylesheet is an empty, intentional fallback and no missing font is requested.

The owner-only Pages workflow accepts three compressed font chunks via repository secrets. `node scripts/configure-font.mjs owner/repo /path/to/licensed.otf` configures them through authenticated GitHub CLI, without logging the font bytes. Configure this only for a deployment for which you hold web-use rights. The CI pull-request job does not receive these secrets. Removing the secrets makes future deployments use the fallback.

Screenshots in docs/media are actual prototype views, including my licensed display font. They are evidence of the study, not an additional font license or a claim of universal rendering/performance.

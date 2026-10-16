# Contributing

JellyBox is a working study of jelly as interaction structure. Small, inspectable improvements are welcome. Open an issue for a new mechanism or a substantial public API change before expanding the scope.

## Development

1. Use Node 24 LTS and `npm ci`.
2. Run `npm run dev` for the study.
3. Run `npm run check` before a pull request.
4. For package changes, run `npm run pack:library` and inspect/install the archive in a consumer.

Keep text/targets stable, semantics native, focus visible and meaningful state independent of pigment. Preserve interrupted transitions, reduced motion and CSS fallback. The site consumes the same React controls it exposes; avoid demo-only visual substitutes.

A useful test protects user-visible behavior through a public boundary. Add one when a change introduces logic or fixes a regression; don't mirror implementation or snapshot source strings. Test affected interactions in a browser as well: keyboard, a compact viewport, interruptions and motion preferences where relevant. Describe the scope and limits of that evidence in the pull request.

Use semantic tones (`action`, `info`, `success`, `warning`, `danger`, `neutral`), canonical MOTION values and shared material/density helpers. Core components must remain usable without the optional Three entry. Don't add a renderer for each control.

## Pull requests

Explain the concrete problem, resulting behavior, validation and any relevant limitation. Include a before/after image or short recording for visible changes. Keep unrelated formatting and speculative features separate. We use MIT for contributions; do not include third-party assets without compatible permissions and attribution. In particular, never commit a commercial font.

## Reporting problems

Use GitHub Issues for reproducible bugs and suggestions. Include browser/device, steps, expected/actual behavior and relevant motion/light settings. For a sensitive security report, use GitHub's private vulnerability reporting if enabled; otherwise contact the maintainer through [the portfolio](https://christopherfiore.net/). Do not post credentials or private files in a public issue.

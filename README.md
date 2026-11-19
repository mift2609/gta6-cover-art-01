# Vice Cover Studio — GTA 6 Cover Art Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/mift2609/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/mift2609/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

**Vice Cover Studio** turns your photo into bold multi-panel cover art in the
style of a Vice City poster — no uploads, no network, everything runs on your
machine from static files under `app/`.

- **Any photo:** upload your own picture per panel, or use the built-in
  illustrated sample portraits. Drag to pan, scroll or slide to zoom each
  panel's crop.
- **Multi-panel layouts:** Vice Trio (hero + two sides), Duo, or a Solo hero
  shot — one photo across all panels or a different photo in each.
- **Colour grades:** Vice Sunset (magenta / orange / teal), Neon Nights
  (purple / pink / cyan) and Golden Hour, as canvas gradient overlays with a
  fixed halftone dot pattern.
- **Bold caption lettering:** an editable title and subtitle in Anton
  (SIL Open Font License, vendored under `app/fonts/` with its licence text),
  outlined and coloured to your choice.
- **One-click export:** PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Try it

```sh
node serve.ts
```

Then open the address it prints (http://localhost:8080). Sample portraits
load automatically so the cover is alive on first open.

## Layout

- `app/` — the static app: `index.html`, `style.css`, `src/cover.js`
  (render engine), `src/main.js` (editor), `src/shots.js` (fixed
  `?shot=` scenes for screenshots), `fonts/Anton-Regular.ttf` (OFL),
  `samples/` (original illustrated portraits, made with an image model).
- `screenshots/` — the cover and editor screenshots the judge sees.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny local static server for development.

All artwork is original: no Rockstar Games logo, artwork or font is used.

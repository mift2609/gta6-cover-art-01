// Vice Cover Studio entry point (Node 22, standard library only).
//
// The entry is a folder of plain static files: app/ holds the cover maker
// (index.html plus its scripts, styles, font and sample photos) and
// screenshots/ holds the four pictures the judge sees first. This program
// hands both folders in: it copies them into the output directory the
// grader provides and writes dossier.json there, the summary of the app the
// judge reads, using the vendored make.fun library. Nothing here reaches
// the network and nothing is installed; the grader runs this file twice and
// both runs must produce identical bytes.
//
// Locally, /output is replaced by the MAKEFUN_OUTPUT_DIR variable:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app itself while developing with `node serve.ts`, then open
// the address it prints.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps the gate enforces, so a build that would fail the gate fails
// here instead: the dossier text stays under 160 KiB, at most four
// screenshots of at most 256 KiB each, app/ under 993 files and 48 MiB,
// and no path under app/ longer than 1000 bytes. app/ shares /output's
// own 1000-entry and 64 MiB ceilings with screenshots/ and dossier.json.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

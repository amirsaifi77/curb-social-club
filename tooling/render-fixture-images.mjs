#!/usr/bin/env node
// Renders the placeholder images `bin/rails seeds:dev` attaches to the
// fabricated rows in apps/api/db/seeds/dev (one cover per event, an avatar
// and banner per club, a logo and banner per sponsor). The output is
// committed under apps/api/db/seeds/dev/images, so this only needs to run
// again when a fixture row is added or renamed.
//
//   node tooling/render-fixture-images.mjs
//
// It draws each image as a small HTML page and screenshots it with the
// Chromium that apps/web already depends on for its Playwright smoke test,
// so `pnpm install` is the only setup. The compositions follow the brand
// guide (brand/brand-guide.md): flat fills from the three palettes, hairline
// rules, a serif title, and the place and the time in the caption. Every
// image says it is a placeholder, because the rows it belongs to are
// invented and the pictures should never be mistaken for a real lot.

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'apps/api/db/seeds/dev/images');

// Palette roles from brand/brand-guide.md. Each theme is one solid ground
// and the ink that reads on it; muted text and rules are the ink at reduced
// alpha, which is how the guide derives secondary text and hairlines too.
const THEMES = {
  lido: { bg: '#0E2A47', ink: '#F3F4F4' }, // Marine Layer accent
  slate: { bg: '#48677D', ink: '#F3F4F4' }, // Marine Layer pinUpcoming
  asphalt: { bg: '#15181A', ink: '#EDEFF0' }, // Marine Layer dark bg
  fog: { bg: '#F3F4F4', ink: '#23272A' }, // Marine Layer light bg
  brass: { bg: '#7A5A1E', ink: '#FAF7F0' }, // Harbor accent
  navy: { bg: '#0F1A2B', ink: '#F1ECE1' }, // Harbor dark bg
  sienna: { bg: '#8A3D1F', ink: '#F3F0E5' }, // Olive and Ivory accent
  heather: { bg: '#5E5B7A', ink: '#F3F4F4' }, // Marine Layer pinRecurring
  charcoal: { bg: '#23272A', ink: '#EDEFF0' }, // Marine Layer textPrimary
};

// Slugs match db/seeds/dev/*.csv.erb; the captions come from the same rows.
const EVENTS = [
  {
    slug: 'dev-harbor-coffee-run',
    title: 'Harbor Coffee Run',
    caption: 'Harbor View Lot, Newport Beach. Saturdays, 7 to 9 am.',
    theme: 'lido',
  },
  {
    slug: 'dev-back-bay-sunday',
    title: 'Back Bay Sunday',
    caption: 'Back Bay Overlook, Corona del Mar. Sundays, 8 to 9:30 am.',
    theme: 'slate',
  },
  {
    slug: 'dev-first-friday-lot',
    title: 'First Friday Lot',
    caption: 'Canyon Road Structure, level 4, Laguna Beach. First Friday, 6 to 9 pm.',
    theme: 'asphalt',
  },
  {
    slug: 'dev-dana-point-cruise',
    title: 'Dana Point Cruise In',
    caption: 'Harbor Point Lot, Dana Point. Last Saturday, 9 to 11:30 am.',
    theme: 'brass',
  },
  {
    slug: 'dev-foothill-night',
    title: 'Foothill Night Meet',
    caption: 'Foothill Plaza Lot, Rancho Cucamonga. Thursdays, 7 to 9 pm.',
    theme: 'navy',
  },
  {
    slug: 'dev-summit-series',
    title: 'Summit Wednesday Series',
    caption: 'Summit Avenue Lot, Fontana. Wednesdays, 5:30 to 8:30 pm, all summer.',
    theme: 'sienna',
  },
  {
    slug: 'dev-pier-bowl-morning',
    title: 'Pier Bowl Morning',
    caption: 'Pier Bowl Lot, San Clemente. One Saturday, 8 to 10 am.',
    theme: 'fog',
  },
];

const CLUBS = [
  {
    slug: 'dev-harbor-motoring',
    name: 'Harbor Motoring Club',
    caption: 'Newport Beach. This club does not exist.',
    monogram: 'HM',
    theme: 'lido',
  },
  {
    slug: 'dev-inland-air',
    name: 'Inland Air Society',
    caption: 'Rancho Cucamonga. This club does not exist.',
    monogram: 'IA',
    theme: 'heather',
  },
];

const SPONSORS = [
  {
    slug: 'dev-marina-detail',
    name: 'Marina Detail Co',
    caption: 'Paint correction and coating, Newport Beach. This shop does not exist.',
    monogram: 'MD',
    theme: 'charcoal',
  },
  {
    slug: 'dev-two-lane-coffee',
    name: 'Two Lane Coffee',
    caption: 'Roasted a mile from the lot, Costa Mesa. This roaster does not exist.',
    monogram: 'TL',
    theme: 'brass',
  },
];

const WIDE = { width: 1200, height: 675 };
const SQUARE = { width: 512, height: 512 };

// Instrument Serif and Geist are the brand faces; the fallbacks are what a
// stock machine has, so the output is stable wherever this runs.
const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body { color: var(--ink); background: var(--bg); position: relative;
    font-family: Geist, "Liberation Sans", "DejaVu Sans", Arial, sans-serif; }
  .serif { font-family: "Instrument Serif", Georgia, "Liberation Serif", "DejaVu Serif", serif; }
  .muted { opacity: 0.72; }
  .label { position: absolute; top: 44px; font-size: 17px; letter-spacing: 0.1em;
    text-transform: uppercase; }
  .label.left { left: 60px; }
  .label.right { right: 60px; }
  .title { position: absolute; left: 60px; top: 150px; width: 1000px;
    font-size: 108px; line-height: 1.02; letter-spacing: -0.01em; }
  .caption { position: absolute; left: 60px; top: 410px; width: 1080px;
    font-size: 27px; line-height: 1.35; }
  .lot { position: absolute; left: 0; right: 0; bottom: 0; height: 130px;
    border-top: 1px solid var(--rule); }
  .stall { position: absolute; top: 24px; bottom: 0; width: 1px; background: var(--rule); }
  .stall.solid { width: 96px; bottom: 0; top: 24px; background: var(--fill); }
  .ring { position: absolute; inset: 26px; border: 1px solid var(--rule); border-radius: 50%; }
  .monogram { position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: 228px; line-height: 1; letter-spacing: -0.02em;
    padding-bottom: 12px; }
  .tag { position: absolute; left: 0; right: 0; bottom: 56px; text-align: center;
    font-size: 15px; letter-spacing: 0.12em; text-transform: uppercase; }
`;

function page(theme, body) {
  const { bg, ink } = THEMES[theme];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root { --bg: ${bg}; --ink: ${ink}; --rule: ${ink}59; --fill: ${ink}1F; }
    ${CSS}</style></head><body>${body}</body></html>`;
}

// The lot: one hairline for the curb, stall lines below it, one stall
// filled at low alpha so the band reads as a place and not a chart.
function lot() {
  const stalls = [];
  for (let x = 60; x < WIDE.width; x += 108)
    stalls.push(`<div class="stall" style="left:${x}px"></div>`);
  stalls.push('<div class="stall solid" style="left:493px"></div>');
  return `<div class="lot">${stalls.join('')}</div>`;
}

function wide({ theme, kind, title, caption }) {
  return page(
    theme,
    `<div class="label left muted">Placeholder ${kind}</div>
     <div class="label right muted">Development fixture</div>
     <div class="title serif">${title}</div>
     <div class="caption muted">${caption}</div>
     ${lot()}`,
  );
}

function square({ theme, monogram }) {
  return page(
    theme,
    `<div class="ring"></div>
     <div class="monogram serif">${monogram}</div>
     <div class="tag muted">Fixture</div>`,
  );
}

function loadChromium() {
  const candidates = [path.join(root, 'apps/web/package.json'), import.meta.url];
  for (const from of candidates) {
    for (const name of ['@playwright/test', 'playwright']) {
      try {
        return createRequire(from)(name).chromium;
      } catch {
        // Try the next package or the next resolution root.
      }
    }
  }
  throw new Error(
    'Playwright is not installed. Run pnpm install (apps/web depends on @playwright/test).',
  );
}

const JOBS = [
  ...EVENTS.map((e) => ({
    file: `events/${e.slug}-cover.jpg`,
    size: WIDE,
    html: wide({ ...e, kind: 'cover' }),
  })),
  ...CLUBS.flatMap((c) => [
    { file: `clubs/${c.slug}-avatar.jpg`, size: SQUARE, html: square(c) },
    {
      file: `clubs/${c.slug}-banner.jpg`,
      size: WIDE,
      html: wide({ ...c, kind: 'banner', title: c.name }),
    },
  ]),
  ...SPONSORS.flatMap((s) => [
    { file: `sponsors/${s.slug}-logo.jpg`, size: SQUARE, html: square(s) },
    {
      file: `sponsors/${s.slug}-banner.jpg`,
      size: WIDE,
      html: wide({ ...s, kind: 'banner', title: s.name }),
    },
  ]),
];

const chromium = loadChromium();
const browser = await chromium.launch();
try {
  for (const job of JOBS) {
    const target = path.join(outDir, job.file);
    await mkdir(path.dirname(target), { recursive: true });
    const pageHandle = await browser.newPage({ viewport: job.size, deviceScaleFactor: 1 });
    await pageHandle.setContent(job.html, { waitUntil: 'load' });
    await pageHandle.screenshot({ path: target, type: 'jpeg', quality: 86 });
    await pageHandle.close();
    console.log(`wrote ${path.relative(root, target)}`);
  }
} finally {
  await browser.close();
}

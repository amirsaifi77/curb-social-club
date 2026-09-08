import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CLUB_COPY, PROFILE_COPY, SPONSOR_COPY, relationLabel, sponsorKindLabel } from './copy';

// CLAUDE.md: exact strings live in each spec's Copy table. Asserting a
// screen against the constant next to it only proves the screen and the
// constant agree; both can drift from the spec together. This reads the
// tables themselves.

const SPECS = join(__dirname, '..', '..', '..', '..', '..', 'docs', 'specs');

// Every "| Where | String |" row of a spec's `## Copy` section, by row label.
function copyTable(spec: string): Record<string, string> {
  const text = readFileSync(join(SPECS, spec), 'utf8');
  const start = text.indexOf('\n## Copy\n');
  expect(start).toBeGreaterThan(-1);
  const section = text.slice(start + 1, text.indexOf('\n## ', start + 1));
  const rows: Record<string, string> = {};
  for (const line of section.split('\n')) {
    const match = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/.exec(line);
    if (!match?.[1] || !match[2] || match[1] === 'Where' || /^-+$/.test(match[1])) continue;
    rows[match[1]] = match[2];
  }
  return rows;
}

describe('the host page strings match the Copy tables they came from', () => {
  it('clubs.md S12 and S13', () => {
    const copy = copyTable('clubs.md');

    expect(CLUB_COPY.verified).toBe(copy['S12 header, verified']);
    expect(CLUB_COPY.upcomingHeader).toBe(copy['S12 upcoming header']);
    expect(CLUB_COPY.upcomingEmpty).toBe(copy['S12 upcoming empty']);
    expect(CLUB_COPY.seeAll).toBe(copy['S12 see all']);
    expect(CLUB_COPY.hidden).toBe(copy['S12 hidden']);
    expect(CLUB_COPY.membersEmpty).toBe(copy['S13 empty']);
  });

  it('sponsors.md S14', () => {
    const copy = copyTable('sponsors.md');

    expect(SPONSOR_COPY.verified).toBe(copy['S14 verified']);
    expect(SPONSOR_COPY.upcomingHeader).toBe(copy['S14 upcoming header']);
    expect(SPONSOR_COPY.upcomingEmpty).toBe(copy['S14 upcoming empty']);
    expect(SPONSOR_COPY.website).toBe(copy['S14 website']);
    expect(SPONSOR_COPY.seeAll).toBe(copy['S14 see all']);
    expect(SPONSOR_COPY.hidden).toBe(copy['S14 hidden']);
    expect(SPONSOR_COPY.footer).toBe(copy['S14 footer line']);
    // One row, a message plus a retry control, the way discovery.md writes
    // the same pair. The parenthetical is the spec's own annotation.
    const error = copy['S14 error']?.replace(/\s*\(.*\)$/, '');
    expect(`${SPONSOR_COPY.error} ${SPONSOR_COPY.errorAction}.`).toBe(error);
  });

  it('sponsors.md kind and relation labels', () => {
    const copy = copyTable('sponsors.md');

    expect(sponsorKindLabel('brand')).toBe(copy['Kind label, brand']);
    expect(sponsorKindLabel('vendor')).toBe(copy['Kind label, vendor']);
    expect(sponsorKindLabel('venue')).toBe(copy['Kind label, venue']);
    expect([relationLabel('host'), relationLabel('sponsor')].join(', ')).toBe(
      copy['S14 relation labels'],
    );
  });

  it('profiles-and-follow.md S11', () => {
    const copy = copyTable('profiles-and-follow.md');

    expect(PROFILE_COPY.hostBadge).toBe(copy['S11 host badge']);
    expect(PROFILE_COPY.clubsEmpty).toBe(copy['S11 clubs empty']);
    expect(PROFILE_COPY.notFound).toBe(copy['S11 not found']);
    expect(PROFILE_COPY.blocked).toBe(copy['S11 blocked']);
  });

  it('no Phase 7 club string reaches Phase 1', () => {
    const copy = copyTable('clubs.md');
    const phase7 = Object.entries(copy)
      .filter(([where]) => /\(7\)$/.test(where))
      .map(([, string]) => string);

    expect(phase7.length).toBeGreaterThan(0);
    const shipped: string[] = Object.values(CLUB_COPY);
    for (const string of phase7) expect(shipped).not.toContain(string);
  });
});

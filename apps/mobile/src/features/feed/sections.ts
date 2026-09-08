import type { ClubSummary, EventSummary, FeedSection, SponsorSummary } from '@curb/api-client';

// Discovery R-12: the API decides the order and which sections exist. The
// client renders what it is given and hides nothing but the kinds it cannot
// draw yet, so a section added server-side needs no client release.

// Phase 1 draws events, clubs, and sponsors. `following`, `recent_photos`,
// and `spots_nearby` arrive with their own specs and render as nothing
// until then rather than as an empty titled group. Their titles are here so
// the Copy table has one home in the client.
export const SECTION_TITLES = {
  this_weekend: 'This weekend',
  next_week: 'Next week',
  later: 'Later',
  clubs_nearby: 'Clubs near you',
  sponsors_nearby: 'Sponsors near you',
} as const;

export const UNDRAWN_TITLES = {
  following: 'From people you follow',
  recent_photos: 'Recent photos',
  spots_nearby: 'Spots near you',
} as const;

export const RENDERABLE_KINDS = Object.keys(SECTION_TITLES) as RenderableKind[];

export type RenderableKind = keyof typeof SECTION_TITLES;

// The layout follows the kind, so a club row can never be handed events.
export type RenderableSection =
  | {
      kind: 'this_weekend' | 'next_week' | 'later';
      title: string;
      layout: 'events';
      items: EventSummary[];
    }
  | { kind: 'clubs_nearby'; title: string; layout: 'clubs'; items: ClubSummary[] }
  | { kind: 'sponsors_nearby'; title: string; layout: 'sponsors'; items: SponsorSummary[] };

function isRenderable(kind: string): kind is RenderableKind {
  return Object.hasOwn(SECTION_TITLES, kind);
}

// The card reads these; a row that has neither is a row the list would throw
// on, so it is dropped rather than taking the screen down. The API is the
// contract, but a browse screen is the wrong place to find out it moved.
function isEventRow(row: unknown): row is EventSummary {
  if (typeof row !== 'object' || row === null) return false;
  const value = row as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.venue === 'object' && value.venue !== null;
}

function isHostRow(row: unknown): row is ClubSummary | SponsorSummary {
  if (typeof row !== 'object' || row === null) return false;
  const value = row as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.name === 'string';
}

// A section with no items never reaches the list: the API omits empty ones,
// and a client-side guard keeps a titled group from rendering above nothing.
export function renderableSections(sections: FeedSection[] | undefined): RenderableSection[] {
  return (sections ?? []).flatMap((section): RenderableSection[] => {
    if (!isRenderable(section.kind) || !Array.isArray(section.items)) return [];
    // Client copy wins over the API's title, so a wording change ships with
    // the client rather than with the response.
    const title = SECTION_TITLES[section.kind];

    if (section.kind === 'clubs_nearby' || section.kind === 'sponsors_nearby') {
      const items = section.items.filter(isHostRow);
      if (items.length === 0) return [];
      return section.kind === 'clubs_nearby'
        ? [{ kind: section.kind, title, layout: 'clubs', items: items as ClubSummary[] }]
        : [{ kind: section.kind, title, layout: 'sponsors', items: items as SponsorSummary[] }];
    }

    const items = section.items.filter(isEventRow);
    if (items.length === 0) return [];
    return [{ kind: section.kind, title, layout: 'events', items }];
  });
}

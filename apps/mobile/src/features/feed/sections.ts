import type { ClubSummary, EventSummary, FeedSection, SponsorSummary } from '@curb/api-client';

// Discovery R-12: the API decides the order and which sections exist. The
// client renders what it is given and hides nothing but the kinds it cannot
// draw yet, so a section added server-side needs no client release.
export const SECTION_TITLES: Record<string, string> = {
  this_weekend: 'This weekend',
  following: 'From people you follow',
  recent_photos: 'Recent photos',
  clubs_nearby: 'Clubs near you',
  sponsors_nearby: 'Sponsors near you',
  spots_nearby: 'Spots near you',
  next_week: 'Next week',
  later: 'Later',
};

// Phase 1 draws events, clubs, and sponsors. `following`, `recent_photos`,
// and `spots_nearby` arrive with their own specs and render as nothing
// until then rather than as an empty titled group.
export const RENDERABLE_KINDS = ['this_weekend', 'next_week', 'later', 'clubs_nearby', 'sponsors_nearby'] as const;

export type RenderableKind = (typeof RENDERABLE_KINDS)[number];

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
  return (RENDERABLE_KINDS as readonly string[]).includes(kind);
}

// A section with no items never reaches the list: the API omits empty ones,
// and a client-side guard keeps a titled group from rendering above nothing.
export function renderableSections(sections: FeedSection[] | undefined): RenderableSection[] {
  return (sections ?? []).flatMap((section): RenderableSection[] => {
    if (!isRenderable(section.kind) || section.items.length === 0) return [];
    const title = SECTION_TITLES[section.kind] ?? section.title;

    if (section.kind === 'clubs_nearby') {
      return [{ kind: section.kind, title, layout: 'clubs', items: section.items as ClubSummary[] }];
    }
    if (section.kind === 'sponsors_nearby') {
      return [
        { kind: section.kind, title, layout: 'sponsors', items: section.items as SponsorSummary[] },
      ];
    }
    return [{ kind: section.kind, title, layout: 'events', items: section.items as EventSummary[] }];
  });
}

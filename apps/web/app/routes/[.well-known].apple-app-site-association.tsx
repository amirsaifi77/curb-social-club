import { teamId } from '~/lib/env.server';

// W15 (web.md R-18). The file that makes a curbsocial.club link open the
// app instead of Safari. Apple fetches it without following redirects and
// requires application/json, so both are set explicitly rather than left to
// a framework default.

export const APP_BUNDLE_ID = 'club.curbsocial.app';

// R-18: the paths that belong to a screen in the app, and the ones that are
// machinery. /og/ is an image, /calendar/ is a download, and /sign-in and
// /new are surfaces the web app does not have.
export const APPLINK_COMPONENTS = [
  { '/': '/meets/*' },
  // W04's mobile route is occurrences/[id], so both patterns are allowed
  // (web.md Risks, adopted 2026-09-06).
  { '/': '/occurrences/*' },
  { '/': '/u/*' },
  { '/': '/clubs/*' },
  { '/': '/sponsors/*' },
  { '/': '/spots/*' },
  { '/': '/posts/*' },
  { '/': '/og/*', exclude: true, comment: 'Link preview images are not screens' },
  { '/': '/calendar/*', exclude: true, comment: 'Calendar downloads are not screens' },
  { '/': '/sign-in', exclude: true, comment: 'No web sign-in at launch' },
  { '/': '/new', exclude: true, comment: 'Creating a meet is an app surface' },
] as const;

export function buildAasa(team: string) {
  const appId = `${team}.${APP_BUNDLE_ID}`;
  return {
    applinks: {
      details: [{ appID: appId, appIDs: [appId], components: APPLINK_COMPONENTS }],
    },
    webcredentials: { apps: [appId] },
  };
}

export function loader() {
  const team = teamId();
  // Serving the file with a placeholder team id would make every universal
  // link fail silently, and Apple caches it. Absent is the honest answer
  // until App Store Connect gives us one.
  if (!team) throw new Response('Not Found', { status: 404 });

  return new Response(JSON.stringify(buildAasa(team)), {
    headers: {
      // R-18: application/json, and no redirect. Apple does not follow one.
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}

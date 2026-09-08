import { api, errorStatus } from '@curb/api-client';
import { data } from 'react-router';

import type { Route } from './+types/u.$handle';

import { AppLink } from '~/components/AppLink';
import { HostMeets, HostPage } from '~/components/HostPage';
import { nearbyMeets, serverClient } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { HOST_COPY, hostCounts } from '~/lib/copy';
import { isIos } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, pageMeta } from '~/lib/seo';

// W06 (web.md R-28, profiles-and-follow.md Scope Phase 1). The read-only
// user host page. R-9: no JSON-LD here, because a person is not an
// Organization and Person adds nothing a crawler cannot already read.
export async function loader({ request, params }: Route.LoaderArgs) {
  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));

  try {
    const profile = await api.users.get(client, params.handle);
    // Both are the person's own sub-resources; a failure on either is an
    // absent section rather than a failed page.
    const [events, clubs] = await Promise.allSettled([
      api.users.events(client, params.handle),
      api.users.clubs(client, params.handle),
    ]);
    return {
      profile: profile.data,
      events: events.status === 'fulfilled' ? events.value.data : null,
      clubs: clubs.status === 'fulfilled' ? clubs.value.data : null,
      baseUrl: shareBaseUrl(),
      appStoreId: appStoreId(),
      isIos: isIos(request.headers.get('user-agent')),
    };
  } catch (error) {
    // R-7: a suspended or deleted user is a 404, like a handle nobody took.
    if (errorStatus(error) === 404) {
      throw data({ nearby: await nearbyMeets(client, request) }, { status: 404 });
    }
    throw error;
  }
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: `${HOST_COPY.profileNotFound} | curb` }];
  const { profile, baseUrl } = loaderData;
  return pageMeta({
    title: profile.display_name,
    // R-28: the bio, or what they do and where, so a search result says
    // something rather than repeating the name.
    description:
      profile.bio ??
      (profile.home_label ? `Hosts meets in ${profile.home_label}` : `@${profile.handle} on curb`),
    canonical: canonicalUrl(baseUrl, `/u/${profile.handle}`),
    image: profile.avatar_url,
    appStoreId: loaderData.appStoreId,
  });
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { profile, events, clubs, appStoreId: storeId, isIos: onIos } = loaderData;
  const hosted = events ?? [];

  return (
    <HostPage
      name={profile.display_name}
      handle={profile.handle}
      avatarUrl={profile.avatar_url}
      labels={[profile.is_host ? HOST_COPY.profileHostBadge : null]}
      homeLabel={profile.home_label}
      blurb={profile.bio}
      // R-17: the followers count appears only on a host's profile.
      counts={
        profile.is_host
          ? hostCounts(profile.counts.followers ?? 0, profile.counts.events_hosted ?? 0)
          : null
      }
      links={profile.links}
    >
      <p className="mt-4">
        <AppLink path={`u/${profile.handle}`} appStoreId={storeId} isIos={onIos} className="underline">
          {HOST_COPY.follow}
        </AppLink>
      </p>

      {/* A request that failed knows nothing about this person's clubs, so
          the section is absent rather than claiming they are in none. */}
      {clubs ? (
        <section className="mt-10">
          <h2 className="font-display text-3xl">{HOST_COPY.profileClubs}</h2>
          {clubs.length === 0 ? (
            <p className="mt-2 text-textSecondary">{HOST_COPY.profileClubsEmpty}</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-4">
              {clubs.map((club) => (
                <li key={club.id}>
                  <a href={`/clubs/${club.slug}`} className="underline">
                    {club.name}
                  </a>
                  {club.role && profile.handle !== 'curb' ? (
                    <span className="ml-2 text-sm text-textSecondary">
                      {club.role === 'owner' ? 'Owner' : club.role === 'admin' ? 'Admin' : ''}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {hosted.length > 0 ? (
        <HostMeets
          title={HOST_COPY.upcoming}
          events={hosted}
          emptyCopy=""
          seeAll={{ href: `/meets?host=user:${profile.id}`, label: HOST_COPY.seeAll }}
        />
      ) : null}
    </HostPage>
  );
}

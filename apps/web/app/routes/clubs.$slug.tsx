import { api, errorStatus } from '@curb/api-client';
import { data } from 'react-router';

import type { Route } from './+types/clubs.$slug';

import { AppLink } from '~/components/AppLink';
import { HostMeets, HostPage } from '~/components/HostPage';
import { nearbyMeets, serverClient } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { HOST_COPY, followersLine } from '~/lib/copy';
import { isIos } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, jsonLdScript, organizationJsonLd, pageMeta } from '~/lib/seo';

// W08 (web.md R-9, clubs.md R-21). The same content as S12, server
// rendered, with an Organization a crawler can read.
export async function loader({ request, params }: Route.LoaderArgs) {
  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));

  try {
    const [club, members] = await Promise.all([
      api.clubs.get(client, params.slug),
      api.clubs.members(client, params.slug),
    ]);
    return {
      club: club.data,
      members: members.data,
      baseUrl: shareBaseUrl(),
      appStoreId: appStoreId(),
      isIos: isIos(request.headers.get('user-agent')),
    };
  } catch (error) {
    // clubs.md R-5: a hidden club is a 404 everywhere public.
    if (errorStatus(error) === 404) {
      throw data({ nearby: await nearbyMeets(client, request) }, { status: 404 });
    }
    throw error;
  }
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'Not found | curb' }];
  const { club, baseUrl } = loaderData;
  return pageMeta({
    title: club.name,
    description:
      club.description ??
      `${club.name}, a car club${club.home_label ? ` in ${club.home_label}` : ''}.`,
    canonical: canonicalUrl(baseUrl, `/clubs/${club.slug}`),
    image: club.banner_url ?? club.avatar_url,
    appStoreId: loaderData.appStoreId,
  });
}

export default function ClubPage({ loaderData }: Route.ComponentProps) {
  const { club, members, baseUrl, appStoreId: storeId, isIos: onIos } = loaderData;
  const jsonLd = organizationJsonLd(
    {
      name: club.name,
      path: `/clubs/${club.slug}`,
      logoUrl: club.avatar_url,
      description: club.description,
      links: club.links,
    },
    baseUrl,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <HostPage
        name={club.name}
        bannerUrl={club.banner_url}
        avatarUrl={club.avatar_url}
        labels={[club.verified ? HOST_COPY.clubVerified : null]}
        homeLabel={club.home_label}
        blurb={club.description}
        counts={followersLine(club.followers_count)}
        links={club.links}
      >
        <p className="mt-4">
          {/* R-10: following is an app surface, so this is a link out. */}
          <AppLink path={`clubs/${club.slug}`} appStoreId={storeId} isIos={onIos} className="underline">
            {HOST_COPY.follow}
          </AppLink>
        </p>

        <section className="mt-10">
          <h2 className="font-display text-3xl">{HOST_COPY.members}</h2>
          <p className="mt-2 text-textSecondary">
            {club.members_count} {club.members_count === 1 ? 'member' : 'members'}.
          </p>
          {members.length === 0 ? (
            <p className="mt-2 text-textSecondary">{HOST_COPY.membersEmpty}</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-4">
              {members.slice(0, 8).map((member) => (
                <li key={member.id}>
                  <a href={`/u/${member.handle}`} className="underline">
                    {member.display_name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <HostMeets
          title={HOST_COPY.upcoming}
          events={club.upcoming_events}
          emptyCopy={HOST_COPY.upcomingEmpty}
          seeAll={{
            href: `/meets?host=club:${club.id}`,
            label: HOST_COPY.seeAll,
          }}
        />
      </HostPage>
    </>
  );
}

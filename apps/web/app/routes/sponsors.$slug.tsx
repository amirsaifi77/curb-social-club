import { api, errorStatus } from '@curb/api-client';
import { data } from 'react-router';

import type { Route } from './+types/sponsors.$slug';

import { AppLink } from '~/components/AppLink';
import { HostMeets, HostPage } from '~/components/HostPage';
import { nearbyMeets, serverClient } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { HOST_COPY, followersLine, relationLabel, sponsorKindLabel } from '~/lib/copy';
import { isIos } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, jsonLdScript, organizationJsonLd, pageMeta } from '~/lib/seo';

// W09 (web.md R-9, sponsors.md R-19). Matches W08 frame for frame; `kind`
// changes the label and nothing else. No create or edit surface anywhere,
// only the address in the footer (sponsors.md R-18).
export async function loader({ request, params }: Route.LoaderArgs) {
  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));

  try {
    const sponsor = await api.sponsors.get(client, params.slug);
    return {
      sponsor: sponsor.data,
      baseUrl: shareBaseUrl(),
      appStoreId: appStoreId(),
      isIos: isIos(request.headers.get('user-agent')),
    };
  } catch (error) {
    if (errorStatus(error) === 404) {
      throw data({ nearby: await nearbyMeets(client, request) }, { status: 404 });
    }
    throw error;
  }
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'Not found | curb' }];
  const { sponsor, baseUrl } = loaderData;
  return pageMeta({
    title: sponsor.name,
    description:
      sponsor.tagline ??
      sponsor.description ??
      `${sponsor.name}, ${sponsorKindLabel(sponsor.kind).toLowerCase()} at local car meets.`,
    canonical: canonicalUrl(baseUrl, `/sponsors/${sponsor.slug}`),
    image: sponsor.banner_url ?? sponsor.logo_url,
    appStoreId: loaderData.appStoreId,
  });
}

export default function SponsorPage({ loaderData }: Route.ComponentProps) {
  const { sponsor, baseUrl, appStoreId: storeId, isIos: onIos } = loaderData;
  const jsonLd = organizationJsonLd(
    {
      name: sponsor.name,
      path: `/sponsors/${sponsor.slug}`,
      logoUrl: sponsor.logo_url,
      description: sponsor.description ?? sponsor.tagline,
      links: sponsor.links,
      website: sponsor.website,
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
        name={sponsor.name}
        bannerUrl={sponsor.banner_url}
        avatarUrl={sponsor.logo_url}
        labels={[sponsorKindLabel(sponsor.kind), sponsor.verified ? HOST_COPY.sponsorVerified : null]}
        homeLabel={sponsor.home_label}
        blurb={sponsor.tagline}
        counts={followersLine(sponsor.followers_count)}
        links={sponsor.links}
        website={sponsor.website}
        websiteLabel={HOST_COPY.website}
      >
        {sponsor.description ? <p className="mt-4 max-w-readingMax">{sponsor.description}</p> : null}

        <p className="mt-4">
          <AppLink
            path={`sponsors/${sponsor.slug}`}
            appStoreId={storeId}
            isIos={onIos}
            className="underline"
          >
            {HOST_COPY.follow}
          </AppLink>
        </p>

        <HostMeets
          title={HOST_COPY.upcoming}
          events={sponsor.upcoming_events}
          emptyCopy={HOST_COPY.upcomingEmpty}
          seeAll={{ href: `/meets?sponsor=${sponsor.id}`, label: HOST_COPY.seeAll }}
          relationLabelFor={relationLabel}
        />

        {/* sponsors.md R-18: the one thing the site offers a business that
            wants a change. */}
        <p className="mt-10 text-sm text-textSecondary">{HOST_COPY.sponsorFooter}</p>
      </HostPage>
    </>
  );
}

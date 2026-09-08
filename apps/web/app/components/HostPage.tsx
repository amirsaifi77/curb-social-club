import type { EventSummary } from '@curb/api-client';
import { socialLinks, websiteUrl } from '@curb/ui';
import { Link } from 'react-router';

import { MeetCard } from './MeetCard';

// The layout W06, W08 and W09 share, so a club and a sponsor page match
// frame for frame (sponsors.md Verification) and only the label under the
// name differs, exactly as the mobile pages do.

export interface HostPageProps {
  name: string;
  handle?: string | null;
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  labels?: (string | null | undefined)[];
  homeLabel?: string | null;
  blurb?: string | null;
  counts?: string | null;
  links?: Record<string, string> | null;
  website?: string | null;
  websiteLabel?: string;
  children?: React.ReactNode;
}

export function HostPage({
  name,
  handle,
  bannerUrl,
  avatarUrl,
  labels = [],
  homeLabel,
  blurb,
  counts,
  links,
  website,
  websiteLabel,
  children,
}: HostPageProps) {
  const shown = labels.filter((label): label is string => Boolean(label));
  const socials = socialLinks(links);
  const site = websiteUrl(website ?? links?.website ?? null);

  return (
    <main className="mx-auto max-w-pageMax px-gutter pb-16">
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="-mx-gutter aspect-[3/1] w-[calc(100%+2.5rem)] object-cover" />
      ) : (
        <div className="-mx-gutter aspect-[3/1] w-[calc(100%+2.5rem)] bg-surfaceRaised" />
      )}

      <div className="mt-4 flex flex-col gap-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="-mt-12 h-24 w-24 rounded-full border-2 border-bg object-cover" />
        ) : (
          <div className="-mt-12 h-24 w-24 rounded-full border-2 border-bg bg-surfaceRaised" />
        )}
        <h1 className="font-display text-4xl leading-tight">{name}</h1>
        {handle ? <p className="text-textSecondary">@{handle}</p> : null}
        {shown.length > 0 ? (
          <p className="flex flex-wrap gap-3 text-sm text-textSecondary">
            {shown.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </p>
        ) : null}
        {homeLabel ? <p className="text-textSecondary">{homeLabel}</p> : null}
        {blurb ? <p className="max-w-readingMax">{blurb}</p> : null}
        {counts ? <p className="text-sm text-textSecondary">{counts}</p> : null}

        {socials.length > 0 || site ? (
          <p className="flex flex-wrap gap-4">
            {socials.map((link) => (
              // R-28: nofollow, because a host's own accounts are theirs and
              // not an endorsement this page is making.
              <a key={link.platform} href={link.url} rel="nofollow noopener" className="underline">
                {SOCIAL_NAMES[link.platform] ?? link.platform}
              </a>
            ))}
            {site ? (
              <a href={site} rel="nofollow noopener" className="underline">
                {websiteLabel ?? 'Website'}
              </a>
            ) : null}
          </p>
        ) : null}
      </div>

      {children}
    </main>
  );
}

const SOCIAL_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  threads: 'Threads',
};

// Up to three meets, then the list filtered to this host.
export function HostMeets({
  title,
  events,
  emptyCopy,
  seeAll,
  relationLabelFor,
}: {
  title: string;
  events: readonly (EventSummary & { relation?: string })[];
  emptyCopy: string;
  seeAll?: { href: string; label: string };
  relationLabelFor?: (relation: string) => string;
}) {
  const shown = events.slice(0, 3);

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl">{title}</h2>
      {shown.length === 0 ? (
        <p className="mt-4 text-textSecondary">{emptyCopy}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((event) => (
            <li key={event.id}>
              {relationLabelFor && event.relation ? (
                <p className="text-sm text-textSecondary">{relationLabelFor(event.relation)}</p>
              ) : null}
              <MeetCard event={event} />
            </li>
          ))}
        </ul>
      )}
      {seeAll && shown.length > 0 ? (
        <p className="mt-4">
          <Link to={seeAll.href} className="underline">
            {seeAll.label}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

import { useState } from 'react';

import { WEB_COPY } from '~/lib/copy';

// web.md Copy, "W03 share": Copy link, then Link copied. Share on the web
// is the clipboard, not a share sheet: there is no account here and the
// canonical URL is the whole thing worth sending.
export const COPIED_MS = 2_000;

export function CopyLink({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Denied permission, or an insecure context. Saying nothing is better
      // than a failure notice for something the reader can do by hand.
    }
  };

  return (
    <button type="button" onClick={() => void onClick()} className="underline">
      <span aria-live="polite">{copied ? WEB_COPY.shareDone : WEB_COPY.share}</span>
    </button>
  );
}

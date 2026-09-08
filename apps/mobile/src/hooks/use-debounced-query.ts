import { useEffect, useState } from 'react';

// R-20: 250 ms, two characters. The debounce is what makes "one request per
// group" true: without it every keystroke is three requests.
export const DEBOUNCE_MS = 250;
export const MIN_QUERY_LENGTH = 2;

export interface DebouncedQuery {
  /** What the field holds, updated on every keystroke. */
  text: string;
  /** What the queries should ask for, or null while they should not ask. */
  query: string | null;
  setText: (next: string) => void;
  clear: () => void;
}

export function useDebouncedQuery(initial = ''): DebouncedQuery {
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState<string | null>(() => queryFor(initial));

  useEffect(() => {
    const next = queryFor(text);
    // Clearing the field is immediate: the recents list should come back as
    // soon as the field is empty, not a quarter second later.
    if (next === null) {
      setQuery(null);
      return;
    }
    const timer = setTimeout(() => setQuery(next), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  return {
    text,
    query,
    setText,
    clear: () => setText(''),
  };
}

// Trimmed, because a trailing space is not a different search, and short of
// two characters there is nothing worth asking about.
function queryFor(text: string): string | null {
  const trimmed = text.trim();
  return trimmed.length >= MIN_QUERY_LENGTH ? trimmed : null;
}

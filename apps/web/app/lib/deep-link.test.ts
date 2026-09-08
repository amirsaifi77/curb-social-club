import { describe, expect, it, vi } from 'vitest';

import { appStoreUrl, appUrlForPath, isInAppBrowser, isIos, openInApp } from './deep-link';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const INSTAGRAM = `${IPHONE} Instagram 320.0.0.19.108`;
const THREADS = `${IPHONE} Barcelona 350.0.0.0.0 Threads`;
const DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

describe('user agents', () => {
  it('R-10: iOS is where the custom scheme is worth trying', () => {
    expect(isIos(IPHONE)).toBe(true);
    expect(isIos(DESKTOP)).toBe(false);
    expect(isIos(null)).toBe(false);
  });

  it('R-11: the three in-app browsers the bar is for', () => {
    expect(isInAppBrowser(INSTAGRAM)).toBe(true);
    expect(isInAppBrowser(THREADS)).toBe(true);
    expect(isInAppBrowser(`${IPHONE} [FBAN/FBIOS;FBAV/500.0]`)).toBe(true);
    expect(isInAppBrowser(IPHONE)).toBe(false);
    expect(isInAppBrowser(DESKTOP)).toBe(false);
  });
});

describe('appUrlForPath', () => {
  it('opens the app on the same object the page is showing', () => {
    expect(appUrlForPath('/meets/lido-saturday')).toBe('curb://meets/lido-saturday');
    expect(appUrlForPath('occurrences/abc')).toBe('curb://occurrences/abc');
  });
});

describe('appStoreUrl', () => {
  it('R-11: no id, no link', () => {
    expect(appStoreUrl(null)).toBeNull();
    expect(appStoreUrl('6740000000')).toBe('https://apps.apple.com/app/id6740000000');
  });
});

// AC-6: the app first, the store 1.5 s later, and never a write endpoint.
describe('openInApp', () => {
  function fakeWindow(visibility: DocumentVisibilityState = 'visible') {
    const listeners: Record<string, (() => void)[]> = {};
    const doc = {
      visibilityState: visibility,
      addEventListener: (type: string, fn: () => void) => {
        (listeners[type] ??= []).push(fn);
      },
      removeEventListener: vi.fn(),
    };
    return {
      window: {
        document: doc,
        location: { href: '' },
        setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
        clearTimeout: (id: number) => clearTimeout(id),
        addEventListener: (type: string, fn: () => void) => {
          (listeners[type] ??= []).push(fn);
        },
        removeEventListener: vi.fn(),
      } as unknown as Window,
      fire: (type: string) => listeners[type]?.forEach((fn) => fn()),
      doc,
    };
  }

  it('navigates to the app, then to the store when nothing took the link', async () => {
    vi.useFakeTimers();
    const { window } = fakeWindow();

    openInApp(window, {
      appUrl: 'curb://meets/lido-saturday',
      storeUrl: 'https://apps.apple.com/app/id6740000000',
      timeoutMs: 1_500,
    });

    expect(window.location.href).toBe('curb://meets/lido-saturday');
    await vi.advanceTimersByTimeAsync(1_500);
    expect(window.location.href).toBe('https://apps.apple.com/app/id6740000000');
    vi.useRealTimers();
  });

  it('stays put when the app took the link and the page went away', async () => {
    vi.useFakeTimers();
    const { window, fire, doc } = fakeWindow();

    openInApp(window, {
      appUrl: 'curb://meets/lido-saturday',
      storeUrl: 'https://apps.apple.com/app/id6740000000',
      timeoutMs: 1_500,
    });
    doc.visibilityState = 'hidden';
    fire('visibilitychange');
    await vi.advanceTimersByTimeAsync(1_500);

    // Sending Safari to the App Store after the app already opened is a
    // second, wrong jump the reader sees when they come back.
    expect(window.location.href).toBe('curb://meets/lido-saturday');
    vi.useRealTimers();
  });

  it('does nothing at all without a store id', async () => {
    vi.useFakeTimers();
    const { window } = fakeWindow();

    openInApp(window, { appUrl: 'curb://meets/lido-saturday', storeUrl: null, timeoutMs: 1_500 });
    await vi.advanceTimersByTimeAsync(1_500);

    expect(window.location.href).toBe('curb://meets/lido-saturday');
    vi.useRealTimers();
  });
});

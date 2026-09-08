import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Home tab owns a stack (app/(tabs)/(home)) so S02 can carry a native
// large title. A group segment does not change the URL, but the tab trigger
// has to name the group rather than the file it wraps, and getting that
// wrong loses the whole tab at runtime without failing a typecheck.
const APP = join(__dirname, '..', 'app');

describe('the tab route tree', () => {
  it('every NativeTabs trigger names a route that exists', () => {
    const layout = readFileSync(join(APP, '(tabs)', '_layout.tsx'), 'utf8');
    const names = [...layout.matchAll(/NativeTabs\.Trigger name="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(names).toEqual(['(home)', 'map', 'new', 'me']);

    for (const name of names) {
      const asFile = join(APP, '(tabs)', `${name}.tsx`);
      const asDirectory = join(APP, '(tabs)', name, '_layout.tsx');
      expect(existsSync(asFile) || existsSync(asDirectory)).toBe(true);
    }
  });

  it('the root wraps the tree in GestureHandlerRootView', () => {
    // The map's sheet renders a GestureDetector. Without this ancestor a dev
    // build throws on the Map tab and a release build silently refuses to
    // drag, stranding R-18's detents at peek. Jest cannot see either: RNGH
    // suppresses the throw under a test environment.
    const root = readFileSync(join(APP, '_layout.tsx'), 'utf8');

    expect(root).toMatch(/import \{ GestureHandlerRootView \} from 'react-native-gesture-handler'/);
    expect(root).toMatch(/<GestureHandlerRootView/);
  });

  it('the Home group holds the screen its stack titles', () => {
    expect(existsSync(join(APP, '(tabs)', '(home)', 'index.tsx'))).toBe(true);
    // A leftover file here would win over the group and drop the header.
    expect(existsSync(join(APP, '(tabs)', 'index.tsx'))).toBe(false);
  });
});

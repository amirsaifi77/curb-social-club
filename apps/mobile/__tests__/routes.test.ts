import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The Home tab owns a stack (app/(tabs)/(home)) so S02 can carry a native
// large title. A group segment does not change the URL, but the tab trigger
// has to name the group rather than the file it wraps, and getting that
// wrong loses the whole tab at runtime without failing a typecheck.
const APP = join(__dirname, '..', 'app');

// expo-router's own resolver, over the real app directory. File existence
// says nothing about the URL a screen ends up on: a group segment is
// stripped, so wrapping map/ in parentheses silently deletes curb://map and
// leaves S03 sharing `/` with Home. Only the resolved tree shows that.
function routeTree(): Record<string, string[]> {
   
  const { getRoutes } = require('expo-router/build/getRoutes.js');
  const files: string[] = [];
  const walk = (dir: string, prefix = '') => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(`./${rel}`);
    }
  };
  walk(APP);
  const context = Object.assign(() => ({ default: () => null }), {
    keys: () => files,
    resolve: (key: string) => key,
    id: 'app',
  });
  const tree: Record<string, string[]> = {};
  const visit = (node: { route: string; children?: unknown[] }, parent: string) => {
    const children = (node.children ?? []) as { route: string; children?: unknown[] }[];
    tree[parent] = children.map((child) => child.route);
    for (const child of children) visit(child, `${parent}/${child.route}`);
  };
  visit(getRoutes(context, { platform: 'ios' }), '');
  return tree;
}

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

  it('S03 keeps its own URL rather than sharing one with Home', () => {
    const tree = routeTree();

    // A group here would resolve to '' and collide with (home)/index.
    expect(tree['/(tabs)']).toContain('map');
    expect(tree['/(tabs)']).not.toContain('(map)');
    expect(tree['/(tabs)/map']).toEqual(['index']);
    // S05 is a route of its own, off the root stack.
    expect(tree['']).toContain('search');
  });

  it('R-25: a meet and an occurrence each have a route to deep-link into', () => {
    const tree = routeTree();

    // curb://meets/:slug and curb://occurrences/:id, and the same paths
    // under the universal link domain.
    expect(tree['']).toContain('meets/[slug]');
    expect(tree['']).toContain('occurrences/[id]');
  });

  it('clubs AC-10, sponsors AC-13, profiles AC-12: every host chip has somewhere to land', () => {
    const tree = routeTree();

    // hostHref builds /clubs/:slug, /sponsors/:slug and /u/:handle. A chip
    // that opens a route the tree does not carry is a tap into +not-found,
    // which no render test would catch.
    expect(tree['']).toContain('clubs/[slug]');
    expect(tree['']).toContain('sponsors/[slug]');
    expect(tree['']).toContain('u/[handle]');
    // S13 is a sibling route, not a child of the club page: expo-router
    // flattens both into the root stack, and /clubs/:slug/members resolves
    // even though clubs/[slug].tsx is a file rather than a directory.
    expect(tree['']).toContain('clubs/[slug]/members');
    // "See all meets" lands on the filtered list, not on a meet.
    expect(tree['']).toContain('meets/index');
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

  it('each tab group holds the screen its stack wraps', () => {
    for (const dir of ['(home)', 'map']) {
      expect(existsSync(join(APP, '(tabs)', dir, 'index.tsx'))).toBe(true);
      expect(existsSync(join(APP, '(tabs)', dir, '_layout.tsx'))).toBe(true);
    }
    // A leftover file here would win over the directory and drop the header.
    expect(existsSync(join(APP, '(tabs)', 'index.tsx'))).toBe(false);
    expect(existsSync(join(APP, '(tabs)', 'map.tsx'))).toBe(false);
    // `map` is a real segment, not a group: a group would strip it from the
    // URL and leave S03 sharing `/` with Home, deleting curb://map.
    expect(existsSync(join(APP, '(tabs)', '(map)'))).toBe(false);
  });
});

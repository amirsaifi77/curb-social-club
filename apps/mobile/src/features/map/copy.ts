// discovery.md Copy, S03 and S04 rows, word for word.
export const MAP_COPY = {
  chipWeekend: 'This weekend',
  chipDistance: 'Distance',
  chipTheme: 'Theme',
  chipRecurring: 'Recurring only',
  searchThisArea: 'Search this area',
  empty: 'Nothing here this weekend.',
  emptyToggle: 'Show all upcoming',
  truncated: 'Zoom in to see all meets here.',
  error: "Couldn't load this area.",
  errorAction: 'Try again',
  offline: "You're offline. Showing the last results.",
  locateMe: 'Locate me',
  locateDenied: 'Location is off. Pan the map instead.',
  sortSoonest: 'Soonest',
  sortNearest: 'Nearest',
} as const;

// "12 meets in view", the sheet's peek line.
export function peekLabel(count: number): string {
  return `${count} ${count === 1 ? 'meet' : 'meets'} in view`;
}

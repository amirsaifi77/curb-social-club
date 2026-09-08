// discovery.md Copy, word for word. Exported so the specs assert on the
// same strings the screen renders.
export const ONBOARDING_COPY = {
  cardOne: 'Every car meet within 20 miles. Saturday and Sunday mornings, mostly.',
  cardTwo: 'Pick your area. We only use it to sort the map.',
  explainer:
    'curb asks for your approximate location, about a kilometer, to sort meets by distance. It never tracks you.',
  cardThree: 'Anything you drive or like? Optional. It does not change what you see yet.',
  denied: 'Location is off. Pick a city or drop a pin and we sort from there.',
  geocodeFailure: "We couldn't find that city. Drop a pin instead.",
  offline: "You're offline. We'll start you in coastal Orange County and ask again later.",
  pinLater: "The map lands soon. We'll start you in coastal Orange County.",
  useMyLocation: 'Use my location',
  pickACity: 'Pick a city',
  dropAPin: 'Drop a pin',
  skip: 'Skip',
  done: 'Done',
} as const;

// R-4: interests are stored on the device only and change no query.
export const INTERESTS = [
  'jdm',
  'euro',
  'exotic',
  'classic',
  'muscle',
  'truck',
  'ev',
  'bike',
] as const;

export const INTEREST_STORAGE_KEY = 'curb.interests';

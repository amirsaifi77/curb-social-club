import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { clearBrowseArea, toBrowseArea, writeBrowseArea } from './browse-location';
import { deviceRegistration } from './devices';

// expo-application has no native side in jest; the version is not what is
// under test here.
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.2.3' }));

// docs/specs/discovery.md R-2: POST /devices carries the stored area, so a
// device that picked one before it had a row is not left without it.
describe('deviceRegistration', () => {
  beforeEach(() => clearBrowseArea());

  it('R-2: sends the stored area, rounded', () => {
    writeBrowseArea(toBrowseArea(33.5427123, -117.7854456, 'Laguna Beach', 'city'));

    expect(deviceRegistration('a5f0a3f8-0000-4000-8000-000000000001')).toMatchObject({
      home_location: { lat: 33.54, lng: -117.79 },
    });
  });

  it('R-2: omits the area entirely before one is picked', () => {
    expect(deviceRegistration('a5f0a3f8-0000-4000-8000-000000000001')).not.toHaveProperty(
      'home_location',
    );
  });
});

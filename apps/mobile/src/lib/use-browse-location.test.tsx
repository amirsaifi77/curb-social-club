import { api } from '@curb/api-client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { clearBrowseArea, toBrowseArea } from './browse-location';
import { resetBrowseAreaCache, setBrowseArea, useBrowseLocation } from './use-browse-location';

// The hook only needs a client to PATCH the device row; the provider SDKs
// behind the real auth module have no native side in jest.
jest.mock('./auth', () => ({ auth: { client: {} } }));

function Reader() {
  const { near, chosen } = useBrowseLocation();
  return <Text>{`${near} ${chosen ? 'chosen' : 'default'}`}</Text>;
}

// docs/specs/discovery.md R-1, R-2, AC-10.
describe('useBrowseLocation', () => {
  beforeEach(() => {
    clearBrowseArea();
    resetBrowseAreaCache();
    jest.restoreAllMocks();
  });

  it('AC-10: an area committed by S01 reaches an already mounted S02', async () => {
    await render(<Reader />);

    expect(screen.getByText('33.62,-117.93 default')).toBeTruthy();

    // S01 is a modal over a mounted Home, so this happens without a remount.
    await act(() => {
      setBrowseArea(toBrowseArea(33.5427, -117.7854, 'Laguna Beach', 'city'));
    });

    expect(screen.getByText('33.54,-117.79 chosen')).toBeTruthy();
  });

  it('R-1: a precise area committed anywhere still queries rounded', async () => {
    await render(<Reader />);

    await act(() => {
      setBrowseArea({ lat: 33.6172349, lng: -117.9269991, label: 'Near you', source: 'device' });
    });

    expect(screen.getByText('33.62,-117.93 chosen')).toBeTruthy();
  });

  it('R-2: the device row follows the area, rounded, once per area', async () => {
    const update = jest.spyOn(api.devices, 'update').mockResolvedValue({ data: undefined } as never);

    setBrowseArea(toBrowseArea(33.5427123, -117.7854456, 'Laguna Beach', 'city'));
    setBrowseArea(toBrowseArea(33.5427, -117.7854, 'Laguna Beach', 'city'));

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[2]).toEqual({ home_location: { lat: 33.54, lng: -117.79 } });
  });
});

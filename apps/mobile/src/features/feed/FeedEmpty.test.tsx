import '@/lib/unistyles';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  ADD_ACTION,
  EMPTY_HEADLINE,
  EMPTY_WIDENED,
  FeedEmpty,
  WIDEN_ACTION,
} from './FeedEmpty';

// docs/specs/discovery.md AC-12 and the Copy table.
describe('FeedEmpty', () => {
  it('AC-12: shows the headline and both actions, and widening refetches', async () => {
    const onWiden = jest.fn();
    await render(<FeedEmpty widened={false} onWiden={onWiden} onAdd={jest.fn()} />);

    expect(screen.getByText(EMPTY_HEADLINE)).toBeTruthy();
    expect(screen.getByLabelText(WIDEN_ACTION)).toBeTruthy();
    expect(screen.getByLabelText(ADD_ACTION)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(WIDEN_ACTION));
    expect(onWiden).toHaveBeenCalledTimes(1);
  });

  it('AC-12: after widening the copy changes and the widen action is gone', async () => {
    await render(<FeedEmpty widened onWiden={jest.fn()} onAdd={jest.fn()} />);

    expect(screen.getByText(EMPTY_WIDENED)).toBeTruthy();
    expect(screen.queryByLabelText(WIDEN_ACTION)).toBeNull();
    expect(screen.getByLabelText(ADD_ACTION)).toBeTruthy();
  });
});

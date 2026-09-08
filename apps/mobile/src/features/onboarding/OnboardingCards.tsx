import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { INTERESTS, ONBOARDING_COPY } from './copy';
import { defaultArea, geocodeCity, locateDevice } from './locate';
import type { Interest } from './state';

import { toBrowseArea, type BrowseArea } from '@/lib/browse-location';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';


export type CardIndex = 0 | 1 | 2;

// S01: three cards, each with Skip. Location is asked only from card two,
// and only after the explainer above the button (R-10).
export function OnboardingCards({
  onFinish,
}: {
  onFinish: (result: { area: BrowseArea; interests: Interest[] }) => void;
}) {
  const [card, setCard] = useState<CardIndex>(0);
  const [area, setArea] = useState<BrowseArea>(defaultArea());
  const [notice, setNotice] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [picking, setPicking] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);

  const next = () => setCard((current) => (current === 2 ? 2 : ((current + 1) as CardIndex)));
  const finish = (chosen: BrowseArea = area) => onFinish({ area: chosen, interests });

  async function requestLocation() {
    const outcome = await locateDevice();
    if (outcome.status === 'ok') {
      setArea(outcome.area);
      setNotice(null);
      next();
      return;
    }
    setNotice(outcome.status === 'denied' ? ONBOARDING_COPY.denied : ONBOARDING_COPY.offline);
    setPicking(true);
  }

  async function findCity() {
    const outcome = await geocodeCity(city);
    if (outcome.status !== 'ok') {
      // Not found and could not reach the geocoder read differently.
      setNotice(
        outcome.status === 'failed' ? ONBOARDING_COPY.offline : ONBOARDING_COPY.geocodeFailure,
      );
      return;
    }
    setArea(outcome.area);
    setNotice(null);
    next();
  }

  return (
    <View style={styles.screen}>
      {card === 0 ? (
        <View style={styles.card}>
          <Text variant="display">curb</Text>
          <Text variant="body">{ONBOARDING_COPY.cardOne}</Text>
          <TextButton label="Next" emphasis="accent" onPress={next} />
          {/* Skip advances rather than finishing, so AC-8's "Skip on every
              card" is a path a person can actually take. */}
          <TextButton label={ONBOARDING_COPY.skip} onPress={next} />
        </View>
      ) : null}

      {card === 1 ? (
        <View style={styles.card}>
          <Text variant="title">{ONBOARDING_COPY.cardTwo}</Text>
          {/* The explainer sits above the button, so the system prompt never
              arrives without it (R-10). */}
          <Text variant="body" color="secondary">
            {ONBOARDING_COPY.explainer}
          </Text>
          {notice ? (
            <Text variant="caption" color="secondary" accessibilityRole="alert">
              {notice}
            </Text>
          ) : null}

          <TextButton
            label={ONBOARDING_COPY.useMyLocation}
            emphasis="accent"
            onPress={() => void requestLocation()}
          />
          <TextButton label={ONBOARDING_COPY.pickACity} onPress={() => setPicking(true)} />

          {picking ? (
            <View style={styles.picker}>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Laguna Beach"
                accessibilityLabel="City name"
                style={styles.input}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => void findCity()}
              />
              <TextButton label="Search" onPress={() => void findCity()} />
            </View>
          ) : null}

          {/* Drop a pin is the map fallback and the map lands in 1.12. Until
              then it commits the default region and says so, rather than
              advancing silently as though a pin had been placed. */}
          <TextButton
            label={ONBOARDING_COPY.dropAPin}
            onPress={() => {
              setArea(toBrowseArea(defaultArea().lat, defaultArea().lng, 'Dropped pin', 'pin'));
              setNotice(ONBOARDING_COPY.pinLater);
            }}
          />
          <TextButton label={ONBOARDING_COPY.skip} onPress={next} />
        </View>
      ) : null}

      {card === 2 ? (
        <View style={styles.card}>
          <Text variant="title">{ONBOARDING_COPY.cardThree}</Text>
          <View style={styles.interests}>
            {INTERESTS.map((interest) => (
              <TextButton
                key={interest}
                label={interest}
                emphasis={interests.includes(interest) ? 'accent' : 'plain'}
                onPress={() =>
                  setInterests((current) =>
                    current.includes(interest)
                      ? current.filter((value) => value !== interest)
                      : [...current, interest],
                  )
                }
              />
            ))}
          </View>
          <TextButton label={ONBOARDING_COPY.done} emphasis="accent" onPress={() => finish()} />
          <TextButton label={ONBOARDING_COPY.skip} onPress={() => finish()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: rt.insets.top + theme.spacing['8'],
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: rt.insets.bottom + theme.spacing['8'],
  },
  card: {
    gap: theme.spacing['4'],
  },
  picker: {
    gap: theme.spacing['3'],
  },
  input: {
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing['3'],
    paddingHorizontal: theme.spacing['4'],
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing['2'],
  },
}));

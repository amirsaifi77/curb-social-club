import type { ConfigContext, ExpoConfig } from 'expo/config';

// Google Sign-In's config plugin needs the reversed iOS client id as a URL
// scheme; the plugin is added only when the value is set so prebuild works
// before the Google OAuth client exists (see .env.example).
const googleUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  [
    'expo-splash-screen',
    {
      backgroundColor: '#F3F4F4',
      image: './assets/images/splash-icon.png',
      imageWidth: 76,
      dark: { backgroundColor: '#15181A' },
    },
  ],
  'expo-apple-authentication',
  'expo-secure-store',
  // R-10: reduced accuracy, asked from S01 card two and never at launch.
  // The purpose string is the exact copy in discovery.md.
  [
    'expo-location',
    {
      locationWhenInUsePermission:
        'curb uses your approximate location to show meets near you.',
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
    },
  ],
];
if (googleUrlScheme) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleUrlScheme }]);
}

// Sentry's config plugin uploads source maps and dSYMs during native builds
// and needs SENTRY_AUTH_TOKEN (an EAS secret); events report without it, so
// the plugin joins only when the token is present.
if (process.env.SENTRY_AUTH_TOKEN) {
  plugins.push([
    '@sentry/react-native/expo',
    {
      organization: process.env.SENTRY_ORG ?? 'amir-saifi',
      project: process.env.SENTRY_PROJECT ?? 'curb-mobile',
    },
  ]);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'curb',
  slug: 'curb',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'curb',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'club.curbsocial.app',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      // Reduced accuracy is the only level curb asks for (discovery R-10).
      NSLocationDefaultAccuracyReduced: true,
    },
    // R-25: a curbsocial.club/meets link opens S08 directly rather than
    // hopping through Safari. This needs the AASA file served from the
    // domain, which lands with the web app (session 1.17, gaps item 2);
    // until then the curb:// scheme is the path that works.
    associatedDomains: ['applinks:curbsocial.club', 'applinks:www.curbsocial.club'],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins,
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});

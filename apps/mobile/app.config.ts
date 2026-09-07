import type { ConfigContext, ExpoConfig } from 'expo/config';

// Google Sign-In's config plugin needs the reversed iOS client id as a URL
// scheme; the plugin is added only when the value is set so prebuild works
// before the Google OAuth client exists (docs/local-development.md).
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
];
if (googleUrlScheme) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleUrlScheme }]);
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

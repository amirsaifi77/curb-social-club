import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

let configured = false;

// Google Sign-In: the id token for POST /v1/auth/google. The iOS client id
// is public configuration (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).
export async function signInWithGoogleNative(): Promise<string | null> {
  if (!configured) {
    GoogleSignin.configure({ iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google returned no id token');
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw error;
  }
}

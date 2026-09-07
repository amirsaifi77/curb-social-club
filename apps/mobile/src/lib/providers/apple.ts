import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import type { AppleCredential } from '../auth-store';

// Sign in with Apple (R-23): a random nonce, its SHA256 handed to Apple,
// the raw nonce plus identityToken, authorizationCode, and fullName (only
// present on first authorization) returned for POST /v1/auth/apple.
export async function signInWithAppleNative(): Promise<AppleCredential | null> {
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken || !credential.authorizationCode) {
      throw new Error('Apple returned no identity token');
    }
    const name = credential.fullName;
    return {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      nonce,
      fullName:
        name?.givenName || name?.familyName
          ? { givenName: name.givenName, familyName: name.familyName }
          : null,
    };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}

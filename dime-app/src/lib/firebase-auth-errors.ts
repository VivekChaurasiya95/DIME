type FirebaseClientError = {
  code?: string;
  message?: string;
};

const GOOGLE_CLIENT_ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Google sign-in was canceled.",
  "auth/popup-blocked":
    "Your browser blocked the Google popup. Enable popups and try again.",
  "auth/cancelled-popup-request":
    "Another sign-in request was started. Please try again.",
  "auth/network-request-failed":
    "Network error while contacting Google. Check your internet and retry.",
  "auth/too-many-requests":
    "Too many sign-in attempts. Please wait a minute and try again.",
  "auth/operation-not-allowed":
    "Google sign-in is not enabled in Firebase. Enable Google provider in Firebase Authentication.",
  "auth/unauthorized-domain":
    "This domain is not authorized in Firebase Authentication. Add localhost and your current host in Firebase Console -> Authentication -> Settings -> Authorized domains.",
  "auth/invalid-api-key":
    "Firebase API key is invalid. Verify NEXT_PUBLIC_FIREBASE_API_KEY in your environment file.",
  "auth/app-not-authorized":
    "This app is not authorized for Firebase Authentication. Verify your Firebase web app configuration.",
};

export const getGoogleClientErrorMessage = (error: unknown): string => {
  if (typeof error !== "object" || error === null) {
    return "Google sign-in failed. Please try again.";
  }

  const firebaseError = error as FirebaseClientError;
  const code = typeof firebaseError.code === "string" ? firebaseError.code : "";

  if (code && GOOGLE_CLIENT_ERROR_MESSAGES[code]) {
    return GOOGLE_CLIENT_ERROR_MESSAGES[code];
  }

  return "Google sign-in failed. Please try again.";
};

const NEXTAUTH_GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Google token verification failed. Please sign in again.",
  CallbackRouteError:
    "Google sign-in callback failed on the server. Please try again.",
  AccessDenied: "Access denied for this Google account.",
  Configuration: "Google sign-in is not configured correctly on the server.",
};

export const getGoogleServerErrorMessage = (
  errorCode?: string | null,
): string => {
  if (!errorCode) {
    return "Unable to sign in with Google right now. Please try again.";
  }

  return (
    NEXTAUTH_GOOGLE_ERROR_MESSAGES[errorCode] ??
    "Unable to sign in with Google right now. Please try again."
  );
};

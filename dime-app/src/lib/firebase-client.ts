import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const getMissingFirebaseClientVars = () => {
  const missingKeys: string[] = [];

  if (!firebaseWebConfig.apiKey) {
    missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  }

  if (!firebaseWebConfig.authDomain) {
    missingKeys.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  }

  if (!firebaseWebConfig.projectId) {
    missingKeys.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }

  if (!firebaseWebConfig.appId) {
    missingKeys.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  }

  return missingKeys;
};

const getFirebaseApp = () => {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const missingKeys = getMissingFirebaseClientVars();

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase web config: ${missingKeys.join(", ")}. Add them in your environment file.`,
    );
  }

  return initializeApp(firebaseWebConfig);
};

export const getFirebaseClientAuth = () => getAuth(getFirebaseApp());

export const getFirebaseGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

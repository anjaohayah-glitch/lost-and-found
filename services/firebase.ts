import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseExtra =
  ((Constants.expoConfig?.extra as { firebase?: Partial<FirebaseRuntimeConfig> } | undefined)?.firebase ??
    {}) as Partial<FirebaseRuntimeConfig>;

const normalizedStorageBucket = (firebaseExtra.storageBucket ?? '').replace(/^gs:\/\//, '');

const firebaseConfig: FirebaseRuntimeConfig = {
  apiKey: firebaseExtra.apiKey ?? '',
  authDomain: firebaseExtra.authDomain ?? '',
  projectId: firebaseExtra.projectId ?? '',
  storageBucket: normalizedStorageBucket,
  messagingSenderId: firebaseExtra.messagingSenderId ?? '',
  appId: firebaseExtra.appId ?? '',
};

export const FIREBASE_SETUP_MESSAGE =
  'Add your Firebase credentials under expo.extra.firebase in app.json to enable live auth, Firestore, and storage.';

export const firebaseReady = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

export const storageConfigured = normalizedStorageBucket.trim().length > 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function getReactNativePersistenceConfig() {
  try {
    const firebaseAuthRn = require('@firebase/auth') as {
      getReactNativePersistence?: (
        storage: typeof AsyncStorage,
      ) => unknown;
    };

    return firebaseAuthRn.getReactNativePersistence?.(AsyncStorage);
  } catch {
    return undefined;
  }
}

if (firebaseReady) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);

  if (storageConfigured) {
    // Firebase Storage expects the raw bucket domain, not a gs:// URI.
    storage = getStorage(app);
  }

  try {
    const persistence = getReactNativePersistenceConfig();

    auth = initializeAuth(app, {
      persistence: persistence as never,
    });
  } catch {
    auth = getAuth(app);
  }
}

export { app, auth, db, storage };

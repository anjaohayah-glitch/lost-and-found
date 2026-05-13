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

const firebaseConfig: FirebaseRuntimeConfig = {
  apiKey: firebaseExtra.apiKey ?? '',
  authDomain: firebaseExtra.authDomain ?? '',
  projectId: firebaseExtra.projectId ?? '',
  storageBucket: firebaseExtra.storageBucket ?? '',
  messagingSenderId: firebaseExtra.messagingSenderId ?? '',
  appId: firebaseExtra.appId ?? '',
};

export const firebaseReady = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0
);

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
  storage = getStorage(app);

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

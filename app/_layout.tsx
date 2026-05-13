import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { useNotifications } from '../hooks/useNotifications';
import { auth, db, firebaseReady } from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';
import { useStore } from '../store/useStore';

export default function RootLayout() {
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);
  const [authResolved, setAuthResolved] = useState(!firebaseReady || !auth);

  useNotifications();

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setProfile(null);
      setAuthResolved(true);
      return;
    }

    let profileUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      profileUnsubscribe?.();
      profileUnsubscribe = undefined;

      if (!user) {
        setProfile(null);
        setAuthResolved(true);
        return;
      }

      if (!db) {
        setProfile({
          uid: user.uid,
          name: user.displayName ?? 'Campus Member',
          email: user.email ?? '',
          role: 'user',
        });
        setAuthResolved(true);
        return;
      }

      profileUnsubscribe = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          const data = snapshot.data();

          setProfile({
            uid: user.uid,
            name:
              (data?.name as string | undefined) ??
              user.displayName ??
              'Campus Member',
            email: (data?.email as string | undefined) ?? user.email ?? '',
            program: data?.program as string | undefined,
            yearLevel: data?.yearLevel as string | undefined,
            role: (data?.role as 'user' | 'admin' | undefined) ?? 'user',
            isOnline: data?.isOnline as boolean | undefined,
            fcmToken: data?.fcmToken as string | null | undefined,
          });
          setAuthResolved(true);
        },
        () => {
          setProfile({
            uid: user.uid,
            name: user.displayName ?? 'Campus Member',
            email: user.email ?? '',
            role: 'user',
          });
          setAuthResolved(true);
        },
      );
    });

    return () => {
      profileUnsubscribe?.();
      authUnsubscribe();
    };
  }, [setProfile]);

  useEffect(() => {
    const segment0 = segments[0];
    const isSplashRoute = segment0 == null;
    const isAuthRoute = segment0 === 'login' || segment0 === 'register';
    const isUserRoute =
      segment0 === '(tabs)' ||
      segment0 === 'lost-form' ||
      segment0 === 'found-form' ||
      segment0 === 'report' ||
      segment0 === 'post-detail' ||
      segment0 === 'chat';

    if (!rootNavigationState?.key || !authResolved) {
      return;
    }

    if (!firebaseReady || !auth) {
      if (!isSplashRoute && !isUserRoute) {
        router.replace('/(tabs)/home');
      }
      return;
    }

    if (!auth.currentUser) {
      if (!isSplashRoute && !isAuthRoute) {
        router.replace('/login');
      }
      return;
    }

    if (profile?.role === 'admin') {
      if (!isSplashRoute && segment0 !== 'admin') {
        router.replace('/admin');
      }
      return;
    }

    if (!isSplashRoute && !isUserRoute) {
      router.replace('/(tabs)/home');
    }
  }, [authResolved, profile?.role, rootNavigationState?.key, router, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: APP_COLORS.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lost-form" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="found-form"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="post-detail" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="admin" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

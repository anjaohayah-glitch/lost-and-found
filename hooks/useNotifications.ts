import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, db, firebaseReady } from '../services/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    let active = true;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('foxfindz', {
        name: 'FoxFindz',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      }).catch(() => undefined);
    }

    const authUnsubscribe = auth
      ? onAuthStateChanged(auth, (user) => {
          if (!active || !user || !firebaseReady || !db) {
            return;
          }

          void registerForPushNotifications(user.uid);
        })
      : () => undefined;

    return () => {
      active = false;
      authUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!rootNavigationState?.key || !lastNotificationResponse) {
      return;
    }

    const postId = lastNotificationResponse.notification.request.content.data?.postId;

    if (typeof postId === 'string' && postId.length > 0) {
      router.push(`/post-detail?id=${postId}`);
    } else {
      router.push('/(tabs)/notifications');
    }

    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [lastNotificationResponse, rootNavigationState?.key, router]);
}

async function registerForPushNotifications(uid: string) {
  if (!Device.isDevice || !db) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync();
    finalStatus = permission.status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    ((Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      undefined);

  if (!projectId) {
    return;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  if (token) {
    await updateDoc(doc(db, 'users', uid), {
      fcmToken: token,
    }).catch(() => undefined);
  }
}

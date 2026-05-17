import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, db, firebaseReady } from '../services/firebase';
import { useStore } from '../store/useStore';

type NotificationsModule = typeof import('expo-notifications');

const isExpoGo = Constants.appOwnership === 'expo';
let notificationsPromise: Promise<NotificationsModule | null> | null = null;

export function getNotificationsModule() {
  if (isExpoGo) {
    return Promise.resolve(null);
  }

  notificationsPromise ??= import('expo-notifications')
    .then((module) => {
      module.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      return module;
    })
    .catch(() => null);

  return notificationsPromise;
}

export function useNotifications() {
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const setUnreadCount = useStore((state) => state.setUnreadCount);
  const initializedNotificationIds = useRef(false);
  const seenNotificationIds = useRef(new Set<string>());

  useEffect(() => {
    let active = true;

    void getNotificationsModule().then((notifications) => {
      if (!active || !notifications || Platform.OS !== 'android') {
        return;
      }

      notifications.setNotificationChannelAsync('foxfindz', {
        name: 'FoxFindz',
        importance: notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      }).catch(() => undefined);
    });

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
    if (!firebaseReady || !auth || !db) {
      setUnreadCount(0);
      return;
    }

    let notificationsUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      notificationsUnsubscribe?.();
      notificationsUnsubscribe = undefined;
      initializedNotificationIds.current = false;
      seenNotificationIds.current = new Set();

      if (!user || !db) {
        setUnreadCount(0);
        return;
      }

      notificationsUnsubscribe = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.uid)),
        (snapshot) => {
          const unread = snapshot.docs.filter((entry) => entry.data().read === false).length;
          setUnreadCount(unread);

          const unreadDocs = snapshot.docs.filter((entry) => entry.data().read === false);

          if (initializedNotificationIds.current) {
            unreadDocs.forEach((entry) => {
              if (seenNotificationIds.current.has(entry.id)) {
                return;
              }

              const data = entry.data();
              const message =
                typeof data.message === 'string' ? data.message : 'You have a new FoxFindz update.';

              void getNotificationsModule().then((notifications) => {
                if (!notifications) {
                  return;
                }

                notifications.scheduleNotificationAsync({
                  content: {
                    title: 'FoxFindz',
                    body: message,
                    data: {
                      postId: typeof data.postId === 'string' ? data.postId : '',
                      type: typeof data.type === 'string' ? data.type : 'update',
                    },
                    sound: 'default',
                  },
                  trigger: null,
                }).catch(() => undefined);
              });
            });
          }

          seenNotificationIds.current = new Set(unreadDocs.map((entry) => entry.id));
          initializedNotificationIds.current = true;
        },
        () => setUnreadCount(0),
      );
    });

    return () => {
      notificationsUnsubscribe?.();
      authUnsubscribe();
    };
  }, [setUnreadCount]);

  useEffect(() => {
    if (!rootNavigationState?.key) {
      return;
    }

    let active = true;
    let subscription: { remove: () => void } | undefined;

    void getNotificationsModule().then((notifications) => {
      if (!active || !notifications) {
        return;
      }

      subscription = notifications.addNotificationResponseReceivedListener((response) => {
        const postId = response.notification.request.content.data?.postId;

        if (typeof postId === 'string' && postId.length > 0) {
          router.push(`/post-detail?id=${postId}`);
        } else {
          router.push('/(tabs)/notifications');
        }
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [rootNavigationState?.key, router]);
}

export async function registerForPushNotifications(uid: string) {
  if (!Device.isDevice || !db) {
    return;
  }

  const notifications = await getNotificationsModule();

  if (!notifications) {
    return;
  }

  const { status: existingStatus } = await notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const permission = await notifications.requestPermissionsAsync();
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
    await notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  if (token) {
    await updateDoc(doc(db, 'users', uid), {
      fcmToken: token,
    }).catch(() => undefined);
  }
}

export async function getPushPermissionStatus() {
  const notifications = await getNotificationsModule();

  if (!notifications) {
    return null;
  }

  return notifications.getPermissionsAsync();
}

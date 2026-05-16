import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import OfflineBanner from '../../components/OfflineBanner';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../../services/firebase';
import { APP_COLORS } from '../../src/constants/colors';
import type { TimestampLike } from '../../src/types/post';
import { formatPostDate, resolvePostDate } from '../../src/utils/timeAgo';
import { useStore } from '../../store/useStore';
import { registerForPushNotifications } from '../../hooks/useNotifications';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
} from '../../utils/haptics';

interface AppNotification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: TimestampLike;
  postId?: string;
  type?: string;
}

type NotificationFilter = 'all' | 'unread';
type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | null;

function getNotificationMeta(type?: string) {
  if (type === 'post_approved') {
    return {
      icon: 'checkmark-circle-outline' as const,
      color: APP_COLORS.found,
      background: APP_COLORS.foundLight,
      label: 'Approved',
    };
  }

  if (type === 'post_rejected') {
    return {
      icon: 'close-circle-outline' as const,
      color: APP_COLORS.lost,
      background: APP_COLORS.lostLight,
      label: 'Rejected',
    };
  }

  if (type === 'post_resolved') {
    return {
      icon: 'checkmark-done-outline' as const,
      color: APP_COLORS.primary,
      background: APP_COLORS.surfaceAlt,
      label: 'Solved',
    };
  }

  if (type === 'item_found_notice') {
    return {
      icon: 'sparkles-outline' as const,
      color: '#92400E',
      background: '#FFFBEB',
      label: 'Found',
    };
  }

  return {
    icon: 'notifications-outline' as const,
    color: APP_COLORS.primary,
    background: APP_COLORS.surfaceAlt,
    label: 'Update',
  };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const setUnreadCount = useStore((state) => state.setUnreadCount);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((permission) => setPushPermission(permission.status))
      .catch(() => setPushPermission(null));
  }, []);

  useEffect(() => {
    if (!firebaseReady || !db || !auth) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let notificationsUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      notificationsUnsubscribe?.();
      notificationsUnsubscribe = undefined;

      if (!user || !db) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      notificationsUnsubscribe = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.uid)),
        (snapshot) => {
          const nextNotifications = snapshot.docs
            .map(
              (entry) =>
                ({
                  id: entry.id,
                  ...(entry.data() as Omit<AppNotification, 'id'>),
                }) satisfies AppNotification,
            )
            .sort((left, right) => {
              const leftTime = resolvePostDate(left.createdAt)?.getTime() ?? 0;
              const rightTime = resolvePostDate(right.createdAt)?.getTime() ?? 0;

              return rightTime - leftTime;
            });

          setNotifications(nextNotifications);
          setUnreadCount(
            nextNotifications.filter((notification) => !notification.read).length,
          );
        },
        () => {
          setNotifications([]);
          setUnreadCount(0);
        },
      );
    });

    return () => {
      notificationsUnsubscribe?.();
      authUnsubscribe();
    };
  }, [setUnreadCount]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const filteredNotifications = useMemo(
    () =>
      activeFilter === 'unread'
        ? notifications.filter((notification) => !notification.read)
        : notifications,
    [activeFilter, notifications],
  );

  const markRead = async (id: string) => {
    hapticLight();

    if (!db) {
      return;
    }

    await updateDoc(doc(db, 'notifications', id), { read: true }).catch(
      () => undefined,
    );
  };

  const markAllRead = async () => {
    hapticSuccess();

    const firestore = db;

    if (!firestore) {
      return;
    }

    const batch = writeBatch(firestore);
    notifications
      .filter((notification) => !notification.read)
      .forEach((notification) => {
        batch.update(doc(firestore, 'notifications', notification.id), {
          read: true,
        });
      });

    await batch.commit().catch(() => undefined);
  };

  const deleteNotification = async (id: string) => {
    if (!db) {
      return;
    }

    await deleteDoc(doc(db, 'notifications', id)).catch(() => undefined);
  };

  const confirmDeleteNotification = (id: string) => {
    hapticWarning();

    Alert.alert('Delete notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteNotification(id),
      },
    ]);
  };

  const clearReadNotifications = async () => {
    hapticWarning();

    const firestore = db;
    const readNotifications = notifications.filter((notification) => notification.read);

    if (!firestore || readNotifications.length === 0) {
      return;
    }

    Alert.alert('Clear read notifications', 'Delete all notifications already marked read?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const batch = writeBatch(firestore);

          readNotifications.forEach((notification) => {
            batch.delete(doc(firestore, 'notifications', notification.id));
          });

          await batch.commit().catch(() => undefined);
        },
      },
    ]);
  };

  const requestPushPermission = async () => {
    hapticMedium();

    const current = await Notifications.getPermissionsAsync().catch(() => null);

    if (current?.status === 'granted') {
      setPushPermission('granted');
      Alert.alert('Push notifications', 'Push notifications are already enabled.');
      return;
    }

    const requested = await Notifications.requestPermissionsAsync().catch(() => null);
    setPushPermission(requested?.status ?? current?.status ?? null);

    if (requested?.status === 'granted') {
      const uid = auth?.currentUser?.uid;

      if (uid) {
        await registerForPushNotifications(uid);
      }

      Alert.alert('Push notifications', 'Push notifications are now enabled for approvals and found-item alerts.');
      return;
    }

    Alert.alert(
      'Permission not enabled',
      'You can enable push notifications from your device settings.',
    );
  };

  const emptyMessage = (() => {
    if (!firebaseReady) {
      return FIREBASE_SETUP_MESSAGE;
    }

    if (!auth?.currentUser) {
      return 'Sign in to receive approval and activity notifications.';
    }

    if (activeFilter === 'unread') {
      return 'No unread notifications.';
    }

    return 'No notifications yet.';
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Activity Center</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                : 'You are all caught up'}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons color={APP_COLORS.primaryDark} name="notifications-outline" size={24} />
          </View>
        </View>

        {!firebaseReady ? (
          <OfflineBanner message={FIREBASE_SETUP_MESSAGE} tone="info" />
        ) : null}

        <TouchableOpacity
          onPress={() => void requestPushPermission()}
          style={styles.permissionCard}
          activeOpacity={0.78}
        >
          <View style={styles.permissionIcon}>
            <Ionicons
              color={pushPermission === 'granted' ? APP_COLORS.found : APP_COLORS.primary}
              name={pushPermission === 'granted' ? 'notifications' : 'notifications-outline'}
              size={18}
            />
          </View>
          <View style={styles.permissionBody}>
            <Text style={styles.permissionTitle}>Push notifications</Text>
            <Text style={styles.permissionText}>
              {pushPermission === 'granted'
                ? 'Enabled for approval and activity alerts.'
                : 'Tap to enable alerts on this device.'}
            </Text>
          </View>
          <Text
            style={[
              styles.permissionState,
              pushPermission === 'granted' && styles.permissionStateEnabled,
            ]}
          >
            {pushPermission === 'granted' ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{notifications.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{unreadCount}</Text>
            <Text style={styles.summaryLabel}>Unread</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{pushPermission === 'granted' ? 'On' : 'Off'}</Text>
            <Text style={styles.summaryLabel}>Push</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.filterRow}>
            {(['all', 'unread'] as NotificationFilter[]).map((filter) => {
              const active = activeFilter === filter;

              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => {
                    hapticLight();
                    setActiveFilter(filter);
                  }}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.78}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.filterTextActive,
                    ]}
                  >
                    {filter === 'all' ? 'All' : `Unread ${unreadCount}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={() => void markAllRead()} style={styles.markAllButton}>
              <Text style={styles.markAll}>Mark read</Text>
            </TouchableOpacity>
          ) : notifications.some((notification) => notification.read) ? (
            <TouchableOpacity
              onPress={() => void clearReadNotifications()}
              style={styles.markAllButton}
            >
              <Text style={styles.markAll}>Clear read</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              colors={[APP_COLORS.primary]}
              tintColor={APP_COLORS.primary}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 500);
              }}
              refreshing={refreshing}
            />
          }
          renderItem={({ item }) => {
            const meta = getNotificationMeta(item.type);

            return (
              <TouchableOpacity
                onPress={() => {
                  void markRead(item.id);

                  if (item.postId) {
                    router.push(`/post-detail?id=${item.postId}`);
                  }
                }}
                style={[styles.item, !item.read ? styles.itemUnread : null]}
                activeOpacity={0.78}
              >
                <View style={[styles.itemIcon, { backgroundColor: meta.background }]}>
                  <Ionicons color={meta.color} name={meta.icon} size={20} />
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTop}>
                    <Text style={[styles.typeLabel, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                    <Text style={styles.time}>{formatPostDate(item.createdAt)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.message,
                      !item.read ? styles.messageUnread : null,
                    ]}
                  >
                    {item.message}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    confirmDeleteNotification(item.id);
                  }}
                  style={styles.deleteButton}
                  hitSlop={8}
                >
                  <Ionicons color={APP_COLORS.textLight} name="trash-outline" size={18} />
                </TouchableOpacity>
                {!item.read ? <View style={styles.dot} /> : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                color={APP_COLORS.textLight}
                name={activeFilter === 'unread' ? 'checkmark-done-outline' : 'notifications-off-outline'}
                size={46}
              />
              <Text style={styles.empty}>{emptyMessage}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primaryDark,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 112,
    padding: 18,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  kicker: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: APP_COLORS.surface,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  permissionCard: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  permissionIcon: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceAlt,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    marginRight: 10,
    width: 42,
  },
  permissionBody: {
    flex: 1,
    minWidth: 0,
  },
  permissionTitle: {
    color: APP_COLORS.text,
    fontWeight: '900',
  },
  permissionText: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  permissionState: {
    backgroundColor: APP_COLORS.background,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  permissionStateEnabled: {
    backgroundColor: APP_COLORS.foundLight,
    borderColor: APP_COLORS.foundBorder,
    color: APP_COLORS.found,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  summaryValue: {
    color: APP_COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  filterText: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: APP_COLORS.surface,
  },
  markAllButton: {
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  markAll: {
    color: APP_COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  listContent: {
    paddingBottom: 18,
  },
  item: {
    backgroundColor: APP_COLORS.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  itemUnread: {
    borderColor: APP_COLORS.primary,
    backgroundColor: '#FFFCFA',
  },
  itemIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  message: {
    color: APP_COLORS.textMuted,
    lineHeight: 20,
  },
  messageUnread: {
    color: APP_COLORS.text,
    fontWeight: '800',
  },
  time: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    marginLeft: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: APP_COLORS.primary,
    marginLeft: 8,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    marginLeft: 8,
    width: 34,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 70,
  },
  empty: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginTop: 12,
    lineHeight: 22,
  },
});

import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signOut } from '@firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import OfflineBanner from '../components/OfflineBanner';
import PostCard from '../components/PostCard';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../services/firebase';
import CategoryIcon from '../src/components/CategoryIcon';
import { getCategoryLabel } from '../src/constants/categories';
import { APP_COLORS } from '../src/constants/colors';
import type { Post } from '../src/types/post';
import { resolvePostDate } from '../src/utils/timeAgo';
import { useStore } from '../store/useStore';
import { sendPushToUser } from '../utils/sendPush';

type AdminPostFilter = 'pending' | 'approved' | 'resolved';

export default function AdminScreen() {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [postFilter, setPostFilter] = useState<AdminPostFilter>('pending');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.replace('/(tabs)/home');
      return;
    }

    if (!firebaseReady || !db) {
      setPendingPosts([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'posts'),
      (snapshot) => {
        const nextPosts = snapshot.docs
          .map(
            (entry) =>
              ({
                id: entry.id,
                ...(entry.data() as Omit<Post, 'id'>),
              }) satisfies Post,
          )
          .sort((left, right) => {
            const leftTime = resolvePostDate(left.createdAt)?.getTime() ?? 0;
            const rightTime = resolvePostDate(right.createdAt)?.getTime() ?? 0;
            return rightTime - leftTime;
          });

        setPosts(nextPosts);
        setPendingPosts(nextPosts.filter((post) => post.status === 'pending'));
      },
      (error) => {
        console.error('admin posts listener error:', error);
        setPosts([]);
        setPendingPosts([]);
      },
    );

    return unsubscribe;
  }, [profile, router]);

  const notifyPostOwner = async (
    post: Post,
    notificationType: 'post_approved' | 'post_rejected',
  ) => {
    if (!db || !post.userId) {
      return false;
    }

    const approved = notificationType === 'post_approved';

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: post.userId,
        message: approved
          ? `Your post "${post.title}" has been approved and is now live!`
          : `Your post "${post.title}" was not approved. Please review our community guidelines and try again.`,
        read: false,
        createdAt: serverTimestamp(),
        postId: post.id,
        type: notificationType,
      });

      await sendPushToUser(
        post.userId,
        approved ? 'Post Approved' : 'Post Not Approved',
        approved
          ? `Your "${post.title}" post is now live in the feed.`
          : `Your "${post.title}" post needs revision.`,
        { postId: post.id, type: notificationType },
      );

      return true;
    } catch (error) {
      console.warn('notifyPostOwner error:', error);
      return false;
    }
  };

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Please try again.';

  const approvePost = async (post: Post) => {
    if (!db) {
      return;
    }

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: auth?.currentUser?.uid ?? null,
      });

      const notified = await notifyPostOwner(post, 'post_approved');

      Alert.alert(
        'Approved',
        notified
          ? `"${post.title}" is now live in the feed.`
          : `"${post.title}" is now live in the feed, but the notification could not be sent.`,
      );
      setSelectedPost(null);
    } catch (error) {
      console.error('approvePost error:', error);
      Alert.alert('Approval Failed', getErrorMessage(error));
    }
  };

  const rejectPost = (post: Post) => {
    const firestore = db;

    if (!firestore) {
      return;
    }

    Alert.alert('Reject Post', `Reject "${post.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(firestore, 'posts', post.id), {
              status: 'rejected',
            });

            const notified = await notifyPostOwner(post, 'post_rejected');

            Alert.alert(
              'Rejected',
              notified
                ? `"${post.title}" was rejected and the user was notified.`
                : `"${post.title}" was rejected, but the notification could not be sent.`,
            );
            setSelectedPost(null);
          } catch (error) {
            console.error('rejectPost error:', error);
            Alert.alert('Reject Failed', getErrorMessage(error));
          }
        },
      },
    ]);
  };

  const resolvePost = (post: Post) => {
    const firestore = db;

    if (!firestore) {
      return;
    }

    Alert.alert(
      'Mark Resolved',
      `Remove "${post.title}" from the public feed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          onPress: async () => {
            try {
              await updateDoc(doc(firestore, 'posts', post.id), {
                status: 'resolved',
              });

              Alert.alert('Resolved', `"${post.title}" was removed from the home feed.`);
              setSelectedPost(null);
            } catch (error) {
              console.error('resolvePost error:', error);
              const message = getErrorMessage(error);
              Alert.alert(
                'Resolve Failed',
                message.toLowerCase().includes('permission')
                  ? 'Firestore rules need to be deployed before approved posts can be marked resolved.'
                  : message,
              );
            }
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth).catch(() => undefined);
    }
    setProfile(null);
    router.replace('/login');
  };

  const noAccess =
    firebaseReady && profile != null && profile.role !== 'admin';

  const dashboard = useMemo(() => {
    const approved = posts.filter((post) => post.status === 'approved').length;
    const rejected = posts.filter((post) => post.status === 'rejected').length;
    const resolved = posts.filter((post) => post.status === 'resolved').length;
    const pending = pendingPosts.length;
    const lost = posts.filter((post) => post.type === 'lost').length;
    const found = posts.filter((post) => post.type === 'found').length;
    const withPhotos = posts.filter((post) => Boolean(post.imageUrl)).length;
    const latestPost = posts[0];

    return {
      approved,
      rejected,
      resolved,
      pending,
      lost,
      found,
      withPhotos,
      total: posts.length,
      latestTitle: latestPost?.title ?? 'No reports yet',
      latestTime: latestPost ? resolvePostDate(latestPost.createdAt)?.toLocaleDateString() ?? 'Recently' : '',
    };
  }, [pendingPosts.length, posts]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => post.status === postFilter),
    [postFilter, posts],
  );

  const emptyMessage =
    postFilter === 'pending'
      ? 'No pending posts, all clear!'
      : postFilter === 'approved'
        ? 'No approved posts yet.'
        : 'No resolved posts yet.';

  const emptyHint =
    postFilter === 'pending'
      ? 'New posts from users will appear here.'
      : postFilter === 'approved'
        ? 'Approved posts that are visible on the home feed will appear here.'
        : 'Resolved posts are hidden from the home feed.';

  if (selectedPost) {
    const isLost = selectedPost.type === 'lost';
    const accentColor = isLost ? APP_COLORS.lost : APP_COLORS.found;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedPost(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          {selectedPost.imageUrl ? (
            <Image
              source={{ uri: selectedPost.imageUrl }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.detailImageFallback,
                {
                  backgroundColor: isLost
                    ? APP_COLORS.lostLight
                    : APP_COLORS.foundLight,
                },
              ]}
            >
              <CategoryIcon category={selectedPost.category} size={64} color={accentColor} />
              <Text style={styles.detailImageFallbackText}>No photo attached</Text>
            </View>
          )}

          <View style={styles.detailCard}>
            <View style={styles.detailBadgeRow}>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: isLost
                      ? APP_COLORS.lostLight
                      : APP_COLORS.foundLight,
                    borderColor: isLost
                      ? APP_COLORS.lostBorder
                      : APP_COLORS.foundBorder,
                  },
                ]}
              >
                <Ionicons
                  name={isLost ? 'search-outline' : 'hand-left-outline'}
                  size={12}
                  color={accentColor}
                />
                <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                  {isLost ? 'LOST' : 'FOUND'}
                </Text>
              </View>
            </View>

            <Text style={styles.detailTitle}>{selectedPost.title}</Text>

            <View style={styles.detailMeta}>
              <DetailMeta icon="location-outline" value={selectedPost.location} />
              <DetailMeta icon="person-outline" value={selectedPost.userName} />
              <DetailMeta icon="mail-outline" value={selectedPost.userEmail ?? 'N/A'} />
              <DetailMeta icon="folder-outline" value={getCategoryLabel(selectedPost.category)} />
            </View>

            <Text style={styles.detailDescLabel}>Description</Text>
            <Text style={styles.detailDesc}>{selectedPost.description}</Text>
          </View>

          <View style={styles.actionRow}>
            {selectedPost.status === 'pending' ? (
              <>
                <ActionButton
                  icon="checkmark-circle-outline"
                  label="Approve"
                  onPress={() => void approvePost(selectedPost)}
                  style={styles.approveButton}
                />
                <ActionButton
                  icon="close-circle-outline"
                  label="Reject"
                  onPress={() => rejectPost(selectedPost)}
                  style={styles.rejectButton}
                />
              </>
            ) : selectedPost.status === 'approved' ? (
              <ActionButton
                icon="archive-outline"
                label="Mark Resolved"
                onPress={() => resolvePost(selectedPost)}
                style={styles.resolveButton}
              />
            ) : (
              <View style={styles.resolvedNotice}>
                <Ionicons name="checkmark-done-outline" size={16} color={APP_COLORS.textMuted} />
                <Text style={styles.resolvedNoticeText}>This post is no longer on the home feed.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            {dashboard.pending} pending approval
          </Text>
        </View>
        <TouchableOpacity onPress={() => void handleLogout()}>
          <Text style={styles.logout}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {!firebaseReady ? (
          <OfflineBanner message={FIREBASE_SETUP_MESSAGE} tone="info" />
        ) : null}

        {noAccess ? (
          <Text style={styles.empty}>You do not have admin access.</Text>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={visiblePosts}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View>
                <View style={styles.overview}>
                  <View style={styles.overviewText}>
                    <Text style={styles.overviewKicker}>Today at a glance</Text>
                    <Text style={styles.overviewTitle}>
                      {dashboard.pending > 0
                        ? `${dashboard.pending} report${dashboard.pending === 1 ? '' : 's'} need review`
                        : 'Review queue is clear'}
                    </Text>
                    <Text style={styles.overviewSub}>
                      Latest: {dashboard.latestTitle}
                      {dashboard.latestTime ? ` • ${dashboard.latestTime}` : ''}
                    </Text>
                  </View>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="shield-checkmark-outline" size={30} color={APP_COLORS.primary} />
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <StatCard
                    icon="time-outline"
                    label="Pending"
                    value={dashboard.pending}
                    color="#92400E"
                    background="#FFFBEB"
                  />
                  <StatCard
                    icon="checkmark-circle-outline"
                    label="Approved"
                    value={dashboard.approved}
                    color={APP_COLORS.found}
                    background={APP_COLORS.foundLight}
                  />
                  <StatCard
                    icon="close-circle-outline"
                    label="Resolved"
                    value={dashboard.resolved}
                    color={APP_COLORS.lost}
                    background={APP_COLORS.lostLight}
                  />
                  <StatCard
                    icon="albums-outline"
                    label="Total"
                    value={dashboard.total}
                    color={APP_COLORS.primary}
                    background={APP_COLORS.surfaceAlt}
                  />
                </View>

                <View style={styles.splitStats}>
                  <View style={styles.splitStat}>
                    <Text style={styles.splitValue}>{dashboard.lost}</Text>
                    <Text style={styles.splitLabel}>Lost reports</Text>
                  </View>
                  <View style={styles.splitDivider} />
                  <View style={styles.splitStat}>
                    <Text style={styles.splitValue}>{dashboard.found}</Text>
                    <Text style={styles.splitLabel}>Found reports</Text>
                  </View>
                  <View style={styles.splitDivider} />
                  <View style={styles.splitStat}>
                    <Text style={styles.splitValue}>{dashboard.withPhotos}</Text>
                    <Text style={styles.splitLabel}>With photos</Text>
                  </View>
                </View>

                <View style={styles.filterTabs}>
                  <FilterTab
                    active={postFilter === 'pending'}
                    label="Pending"
                    onPress={() => setPostFilter('pending')}
                  />
                  <FilterTab
                    active={postFilter === 'approved'}
                    label="Approved"
                    onPress={() => setPostFilter('approved')}
                  />
                  <FilterTab
                    active={postFilter === 'resolved'}
                    label="Resolved"
                    onPress={() => setPostFilter('resolved')}
                  />
                </View>

                <View style={styles.queueHeader}>
                  <Text style={styles.queueTitle}>
                    {postFilter === 'pending'
                      ? 'Pending Review'
                      : postFilter === 'approved'
                        ? 'Live on Home Feed'
                        : 'Resolved Posts'}
                  </Text>
                  <Text style={styles.queueCount}>{visiblePosts.length} item{visiblePosts.length === 1 ? '' : 's'}</Text>
                </View>

                {visiblePosts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={52}
                      color={APP_COLORS.found}
                      style={styles.emptyIcon}
                    />
                    <Text style={styles.empty}>{emptyMessage}</Text>
                    <Text style={styles.emptyHint}>{emptyHint}</Text>
                  </View>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <View style={styles.statusBadge}>
                  <Ionicons
                    name={
                      item.status === 'pending'
                        ? 'time-outline'
                        : item.status === 'approved'
                          ? 'eye-outline'
                          : 'checkmark-done-outline'
                    }
                    size={13}
                    color={item.status === 'approved' ? APP_COLORS.found : '#92400E'}
                  />
                  <Text style={styles.statusBadgeText}>
                    {item.status === 'pending'
                      ? 'PENDING REVIEW'
                      : item.status === 'approved'
                        ? 'LIVE ON HOME FEED'
                        : 'RESOLVED'}
                    {' - tap to view full post'}
                  </Text>
                </View>
                <PostCard post={item} onPress={() => setSelectedPost(item)} />
                {item.status === 'pending' ? (
                  <View style={styles.quickActions}>
                    <ActionButton
                      icon="checkmark-circle-outline"
                      label="Approve"
                      onPress={() => void approvePost(item)}
                      style={styles.approveButton}
                    />
                    <ActionButton
                      icon="close-circle-outline"
                      label="Reject"
                      onPress={() => rejectPost(item)}
                      style={styles.rejectButton}
                    />
                  </View>
                ) : item.status === 'approved' ? (
                  <View style={styles.quickActions}>
                    <ActionButton
                      icon="archive-outline"
                      label="Mark Resolved"
                      onPress={() => resolvePost(item)}
                      style={styles.resolveButton}
                    />
                  </View>
                ) : null}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function DetailMeta({ icon, value }: { icon: ComponentProps<typeof Ionicons>['name']; value: string }) {
  return (
    <View style={styles.detailMetaRow}>
      <Ionicons name={icon} size={15} color={APP_COLORS.textMuted} />
      <Text style={styles.detailMetaVal}>{value}</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  background,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterTab({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterTab, active ? styles.filterTabActive : null]}
    >
      <Text style={[styles.filterTabText, active ? styles.filterTabTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  style,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  style: object;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actionButton, style]}>
      <Ionicons name={icon} size={16} color={APP_COLORS.surface} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  backText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  headerSpacer: {
    width: 60,
  },
  title: {
    color: APP_COLORS.surface,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    fontSize: 13,
  },
  logout: {
    color: APP_COLORS.surface,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    padding: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  overviewText: {
    flex: 1,
    paddingRight: 12,
  },
  overviewKicker: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  overviewTitle: {
    color: APP_COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  overviewSub: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  overviewIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surfaceAlt,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: APP_COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  splitStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  splitStat: {
    flex: 1,
    alignItems: 'center',
  },
  splitValue: {
    color: APP_COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  splitLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  splitDivider: {
    width: 1,
    height: 32,
    backgroundColor: APP_COLORS.border,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueTitle: {
    color: APP_COLORS.text,
    fontSize: 17,
    fontWeight: '900',
  },
  queueCount: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: APP_COLORS.primary,
  },
  filterTabText: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTabTextActive: {
    color: APP_COLORS.surface,
  },
  cardWrap: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 13,
  },
  approveButton: {
    backgroundColor: APP_COLORS.found,
  },
  rejectButton: {
    backgroundColor: APP_COLORS.lost,
  },
  resolveButton: {
    backgroundColor: APP_COLORS.primary,
  },
  actionText: {
    color: APP_COLORS.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  empty: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyHint: {
    textAlign: 'center',
    color: APP_COLORS.textLight,
    marginTop: 8,
    lineHeight: 20,
    fontSize: 13,
  },
  resolvedNotice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    paddingVertical: 13,
  },
  resolvedNoticeText: {
    color: APP_COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  detailContent: {
    paddingBottom: 40,
  },
  detailImage: {
    width: '100%',
    height: 280,
    backgroundColor: APP_COLORS.surfaceAlt,
  },
  detailImageFallback: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailImageFallbackText: {
    fontSize: 14,
    color: APP_COLORS.textMuted,
  },
  detailCard: {
    padding: 16,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: APP_COLORS.text,
    marginBottom: 14,
    lineHeight: 30,
  },
  detailMeta: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMetaVal: {
    color: APP_COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  detailDescLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: APP_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailDesc: {
    fontSize: 15,
    color: APP_COLORS.text,
    lineHeight: 24,
  },
});

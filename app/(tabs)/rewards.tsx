import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import OfflineBanner from '../../components/OfflineBanner';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../../services/firebase';
import { APP_COLORS } from '../../src/constants/colors';
import type { Post, TimestampLike } from '../../src/types/post';
import { formatPostDate, resolvePostDate } from '../../src/utils/timeAgo';

interface RewardEntry {
  id: string;
  userId: string;
  title: string;
  description?: string;
  points: number;
  createdAt: TimestampLike;
}

const DEMO_REWARDS: RewardEntry[] = [
  {
    id: 'demo-reward-1',
    userId: 'demo-user',
    title: 'Helpful finder',
    description: 'A found item report helped another student recover their keys.',
    points: 35,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
  },
  {
    id: 'demo-reward-2',
    userId: 'demo-user',
    title: 'Verified report',
    description: 'Your item details were clear enough for campus review.',
    points: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28),
  },
];

const POINTS_PER_APPROVED_POST = 25;

const BADGES = [
  {
    title: 'Campus Helper',
    points: 100,
    icon: 'ribbon-outline' as const,
  },
  {
    title: 'Trusted Finder',
    points: 250,
    icon: 'shield-checkmark-outline' as const,
  },
  {
    title: 'FoxFindz Hero',
    points: 500,
    icon: 'star-outline' as const,
  },
];

export default function RewardsScreen() {
  const uid = auth?.currentUser?.uid;
  const [approvedPosts, setApprovedPosts] = useState<Post[]>([]);
  const [rewardEntries, setRewardEntries] = useState<RewardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!firebaseReady || !db || !uid) {
      setApprovedPosts([]);
      return;
    }

    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', uid),
      where('status', '==', 'approved'),
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        setApprovedPosts(
          snapshot.docs.map(
            (entry) =>
              ({
                id: entry.id,
                ...(entry.data() as Omit<Post, 'id'>),
              }) satisfies Post,
          ),
        );
      },
      () => setApprovedPosts([]),
    );

    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!firebaseReady || !db || !uid) {
      setRewardEntries(firebaseReady ? [] : DEMO_REWARDS);
      return;
    }

    const rewardsQuery = query(
      collection(db, 'rewards'),
      where('userId', '==', uid),
    );

    const unsubscribe = onSnapshot(
      rewardsQuery,
      (snapshot) => {
        const nextRewards = snapshot.docs
          .map(
            (entry) =>
              ({
                id: entry.id,
                ...(entry.data() as Omit<RewardEntry, 'id'>),
              }) satisfies RewardEntry,
          )
          .sort((left, right) => {
            const leftTime = resolvePostDate(left.createdAt)?.getTime() ?? 0;
            const rightTime = resolvePostDate(right.createdAt)?.getTime() ?? 0;

            return rightTime - leftTime;
          });

        setRewardEntries(nextRewards);
      },
      () => setRewardEntries([]),
    );

    return unsubscribe;
  }, [uid]);

  const earnedPoints = useMemo(() => {
    const approvedPostPoints = approvedPosts.length * POINTS_PER_APPROVED_POST;
    const manualRewardPoints = rewardEntries.reduce(
      (total, reward) => total + reward.points,
      0,
    );

    return approvedPostPoints + manualRewardPoints;
  }, [approvedPosts.length, rewardEntries]);

  const unlockedBadges = BADGES.filter((badge) => earnedPoints >= badge.points);
  const currentBadge = unlockedBadges.at(-1);
  const nextBadge = BADGES.find((badge) => earnedPoints < badge.points);
  const previousMilestone = currentBadge?.points ?? 0;
  const nextMilestone = nextBadge?.points ?? currentBadge?.points ?? BADGES[0].points;
  const progressRange = Math.max(nextMilestone - previousMilestone, 1);
  const progress = nextBadge
    ? Math.min((earnedPoints - previousMilestone) / progressRange, 1)
    : 1;
  const pointsToNext = nextBadge ? Math.max(nextBadge.points - earnedPoints, 0) : 0;

  const activity = useMemo(() => {
    const approvedPostRewards: RewardEntry[] = approvedPosts.map((post) => ({
      id: `post-${post.id}`,
      userId: post.userId ?? '',
      title: `${post.type === 'lost' ? 'Lost' : 'Found'} report approved`,
      description: post.title,
      points: POINTS_PER_APPROVED_POST,
      createdAt: post.approvedAt ?? post.createdAt,
    }));

    return [...rewardEntries, ...approvedPostRewards].sort((left, right) => {
      const leftTime = resolvePostDate(left.createdAt)?.getTime() ?? 0;
      const rightTime = resolvePostDate(right.createdAt)?.getTime() ?? 0;

      return rightTime - leftTime;
    });
  }, [approvedPosts, rewardEntries]);

  const emptyMessage = (() => {
    if (!firebaseReady) {
      return FIREBASE_SETUP_MESSAGE;
    }

    if (!uid) {
      return 'Sign in to track rewards for verified reports and returns.';
    }

    return 'No reward activity yet.';
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Rewards</Text>

        {!firebaseReady ? (
          <OfflineBanner message={FIREBASE_SETUP_MESSAGE} tone="info" />
        ) : null}

        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons color={APP_COLORS.primary} name="gift" size={28} />
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.points}>{earnedPoints}</Text>
            <Text style={styles.summaryLabel}>community points</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.milestone}>
              {nextBadge
                ? `${pointsToNext} points until ${nextBadge.title}`
                : 'All badges unlocked'}
            </Text>
          </View>
        </View>

        <View style={styles.badgePanel}>
          <View style={styles.badgePanelIcon}>
            <Ionicons
              color={currentBadge ? APP_COLORS.primary : APP_COLORS.textLight}
              name={currentBadge?.icon ?? 'ribbon-outline'}
              size={22}
            />
          </View>
          <View style={styles.badgePanelBody}>
            <Text style={styles.badgePanelLabel}>Current badge</Text>
            <Text style={styles.badgePanelTitle}>
              {currentBadge?.title ?? 'No badge yet'}
            </Text>
          </View>
        </View>

        <View style={styles.badgeList}>
          {BADGES.map((badge) => {
            const unlocked = earnedPoints >= badge.points;

            return (
              <View key={badge.title} style={styles.badgeRow}>
                <View
                  style={[
                    styles.badgeIcon,
                    unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked,
                  ]}
                >
                  <Ionicons
                    color={unlocked ? APP_COLORS.primary : APP_COLORS.textLight}
                    name={unlocked ? 'checkmark' : badge.icon}
                    size={16}
                  />
                </View>
                <View style={styles.badgeTextBlock}>
                  <Text style={styles.badgeTitle}>{badge.title}</Text>
                  <Text style={styles.badgeRequirement}>{badge.points} points</Text>
                </View>
                <Text style={[styles.badgeState, unlocked && styles.badgeStateUnlocked]}>
                  {unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{approvedPosts.length}</Text>
            <Text style={styles.statLabel}>approved posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rewardEntries.length}</Text>
            <Text style={styles.statLabel}>bonus rewards</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Activity</Text>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={activity}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              colors={[APP_COLORS.primary]}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 500);
              }}
              refreshing={refreshing}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.activityCard}>
              <View style={styles.activityIcon}>
                <Ionicons color={APP_COLORS.found} name="star" size={18} />
              </View>
              <View style={styles.activityBody}>
                <View style={styles.activityHeader}>
                  <Text numberOfLines={1} style={styles.activityTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.activityPoints}>+{item.points}</Text>
                </View>
                {item.description ? (
                  <Text numberOfLines={2} style={styles.activityDescription}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.activityTime}>{formatPostDate(item.createdAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
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
    padding: 14,
  },
  title: {
    color: APP_COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 14,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 16,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceAlt,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginRight: 14,
    width: 52,
  },
  summaryBody: {
    flex: 1,
  },
  points: {
    color: APP_COLORS.text,
    fontSize: 30,
    fontWeight: '900',
  },
  summaryLabel: {
    color: APP_COLORS.textMuted,
    fontWeight: '700',
    marginBottom: 10,
  },
  progressTrack: {
    backgroundColor: APP_COLORS.border,
    borderRadius: 6,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 6,
    height: 8,
  },
  milestone: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    marginTop: 7,
  },
  badgePanel: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  badgePanelIcon: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceAlt,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  badgePanelBody: {
    flex: 1,
  },
  badgePanelLabel: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  badgePanelTitle: {
    color: APP_COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  badgeList: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 54,
  },
  badgeIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  badgeIconUnlocked: {
    backgroundColor: APP_COLORS.surfaceAlt,
  },
  badgeIconLocked: {
    backgroundColor: APP_COLORS.background,
  },
  badgeTextBlock: {
    flex: 1,
  },
  badgeTitle: {
    color: APP_COLORS.text,
    fontWeight: '800',
  },
  badgeRequirement: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badgeState: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
  },
  badgeStateUnlocked: {
    color: APP_COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: APP_COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: 18,
  },
  activityCard: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  activityIcon: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.foundLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  activityBody: {
    flex: 1,
  },
  activityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityTitle: {
    color: APP_COLORS.text,
    flex: 1,
    fontWeight: '800',
  },
  activityPoints: {
    color: APP_COLORS.found,
    fontWeight: '900',
  },
  activityDescription: {
    color: APP_COLORS.textMuted,
    lineHeight: 20,
  },
  activityTime: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    marginTop: 5,
  },
  empty: {
    color: APP_COLORS.textMuted,
    lineHeight: 22,
    marginTop: 32,
    textAlign: 'center',
  },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import DrawerMenu from '../../components/DrawerMenu';
import PostCard from '../../components/PostCard';
import { auth, db, firebaseReady } from '../../services/firebase';
import { CATEGORIES as CATEGORY_OPTIONS } from '../../src/constants/categories';
import { APP_COLORS } from '../../src/constants/colors';
import { LOCATIONS } from '../../src/constants/locations';
import type { Post, PostType } from '../../src/types/post';
import { buildMockPosts } from '../../src/utils/helpers';
import { resolvePostDate } from '../../src/utils/timeAgo';
import { useStore } from '../../store/useStore';
import { hapticLight } from '../../utils/haptics';

const CATEGORIES = [{ label: 'All', value: 'all', icon: 'apps-outline' as const }, ...CATEGORY_OPTIONS];
const LOCATION_OPTIONS = ['All areas', ...LOCATIONS] as const;

const DAILY_QUOTES = [
  'Small reports make lost items easier to return.',
  'A clear post helps the right person find it faster.',
  'Every found item is one step closer to its owner.',
  'Good details turn a search into a match.',
  'Campus care starts with returning what matters.',
  'Post early, describe clearly, and check updates often.',
  'One helpful report can save someone a difficult day.',
];

function getDailyQuote() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (today.getTime() - startOfYear.getTime()) / 86_400_000,
  );

  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const networkState = Network.useNetworkState();
  const { drawerOpen, filter, setDrawerOpen, setFilter, setIsOffline, profile, unreadCount } = useStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState<(typeof LOCATION_OPTIONS)[number]>('All areas');
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  useEffect(() => {
    const offline =
      networkState.isConnected === false || networkState.isInternetReachable === false;
    setIsOffline(offline);
  }, [networkState.isConnected, networkState.isInternetReachable, setIsOffline]);

  const isOffline = useMemo(
    () =>
      !firebaseReady ||
      networkState.isConnected === false ||
      networkState.isInternetReachable === false,
    [networkState.isConnected, networkState.isInternetReachable],
  );

  useEffect(() => {
    if (!firebaseReady || !db) {
      setPosts(buildMockPosts(filter));
      return;
    }
    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'approved'),
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setPosts(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Post, 'id'>) }) satisfies Post)
            .filter((post) => post.type === filter)
            .sort((left, right) => {
              const leftTime = resolvePostDate(left.createdAt)?.getTime() ?? 0;
              const rightTime = resolvePostDate(right.createdAt)?.getTime() ?? 0;
              return rightTime - leftTime;
            }),
        ),
      (error) => {
        console.error('home approved posts listener error:', error);
        setPosts([]);
      },
    );
    return unsub;
  }, [filter]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.userName?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      );
    }
    if (category !== 'all') {
      result = result.filter((p) => p.category?.toLowerCase() === category);
    }
    if (location !== 'All areas') {
      result = result.filter((p) => p.location === location);
    }
    return result;
  }, [posts, search, category, location]);

  const clearFilters = () => {
    hapticLight();
    setSearch('');
    setCategory('all');
    setLocation('All areas');
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (!firebaseReady) setPosts(buildMockPosts(filter));
    setTimeout(() => setRefreshing(false), 800);
  }, [filter]);

  const handleAvatarPress = () => {
    hapticLight();
    router.push('/(tabs)/settings');
  };

  const handleCreate = (type: PostType) => {
    hapticLight();

    if (firebaseReady && !auth?.currentUser) {
      router.push('/login');
      return;
    }
    router.push(type === 'lost' ? '/lost-form' : '/found-form');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            colors={[APP_COLORS.primary]}
            tintColor={APP_COLORS.primary}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setDrawerOpen(true);
                  }}
                  style={styles.headerBtn}
                >
                  <Ionicons name="menu-outline" size={22} color={APP_COLORS.surface} />
                </TouchableOpacity>

                <View style={styles.headerMid}>
                  <Ionicons name="paw-outline" size={22} color={APP_COLORS.surface} />
                  <Text style={styles.headerTitle}>FoxFindz</Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/notifications')}
                  style={styles.headerBtn}
                >
                  <Ionicons name="notifications-outline" size={22} color={APP_COLORS.surface} />
                  {unreadCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroText}>
              <Text style={styles.heroKicker}>Campus Lost and Found</Text>
              <Text style={styles.heroTitle}>
                {profile?.name ? `Welcome, ${profile.name.split(' ')[0]}` : 'Welcome to FoxFindz'}
              </Text>
              <View style={styles.dailyQuote}>
                <Ionicons name="sparkles-outline" size={13} color="rgba(255,255,255,0.86)" />
                <Text style={styles.dailyQuoteText}>{dailyQuote}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleAvatarPress} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.name ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={APP_COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search item, place, or detail"
              placeholderTextColor={APP_COLORS.textLight}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonLost]}
                  onPress={() => handleCreate('lost')}
                  activeOpacity={0.82}
                >
                  <Ionicons name="search-outline" size={15} color={APP_COLORS.lost} />
                  <Text style={[styles.actionText, { color: APP_COLORS.lost }]}>Report Lost</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonFound]}
                  onPress={() => handleCreate('found')}
                  activeOpacity={0.82}
                >
                  <Ionicons name="hand-left-outline" size={15} color={APP_COLORS.found} />
                  <Text style={[styles.actionText, { color: APP_COLORS.found }]}>Report Found</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{posts.length}</Text>
                  <Text style={styles.summaryLabel}>{filter === 'lost' ? 'lost reports' : 'found reports'}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{CATEGORIES.length - 1}</Text>
                  <Text style={styles.summaryLabel}>categories</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{isOffline ? 'Demo' : 'Live'}</Text>
                  <Text style={styles.summaryLabel}>feed status</Text>
                </View>
              </View>
            </View>

            {isOffline && (
              <View style={styles.offlineBar}>
                <Ionicons name="wifi-outline" size={13} color="#92400E" />
                <Text style={styles.offlineText}>Offline, showing cached posts</Text>
              </View>
            )}

            <View style={styles.feedHeader}>
              <View style={styles.toggle}>
                {(['lost', 'found'] as PostType[]).map((type) => {
                  const isActive = filter === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        hapticLight();
                        setFilter(type);
                      }}
                      style={[
                        styles.toggleBtn,
                        isActive && (type === 'lost' ? styles.toggleLost : styles.toggleFound),
                      ]}
                    >
                      <Ionicons
                        name={type === 'lost' ? 'search-outline' : 'hand-left-outline'}
                        size={13}
                        color={isActive ? APP_COLORS.surface : APP_COLORS.textMuted}
                      />
                      <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                        {type === 'lost' ? 'Lost' : 'Found'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            <Text style={styles.feedCount}>
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
              {isOffline ? ' (cached)' : ''}
            </Text>
          </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => {
                      hapticLight();
                      setCategory(cat.value);
                    }}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={13}
                      color={isActive ? APP_COLORS.primary : APP_COLORS.textMuted}
                    />
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.locationHeader}>
              <View style={styles.locationTitleRow}>
                <Ionicons name="navigate-outline" size={14} color={APP_COLORS.textMuted} />
                <Text style={styles.locationTitle}>Search range</Text>
              </View>
              {(search || category !== 'all' || location !== 'All areas') ? (
                <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.locationChipsRow}
            >
              {LOCATION_OPTIONS.map((option) => {
                const isActive = location === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      hapticLight();
                      setLocation(option);
                    }}
                    style={[styles.locationChip, isActive && styles.locationChipActive]}
                  >
                    <Text style={[styles.locationChipText, isActive && styles.locationChipTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={52} color={APP_COLORS.primary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              {search ? 'No results found' : 'Nothing here yet'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? 'Try another keyword, category, or search range.'
                : `Be the first to post a ${filter} item on campus.`}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => handleCreate(filter)}
              >
                <Text style={styles.emptyBtnText}>+ Post now</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    backgroundColor: APP_COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  headerMid: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.surface,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: APP_COLORS.primary, fontSize: 8, fontWeight: '900' },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroText: {
    flex: 1,
    paddingRight: 14,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: APP_COLORS.surface,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  dailyQuote: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dailyQuoteText: {
    color: 'rgba(255,255,255,0.86)',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  avatarText: { color: APP_COLORS.primaryDark, fontWeight: '900', fontSize: 16 },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  offlineText: { color: '#92400E', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  actionButtonLost: {
    backgroundColor: APP_COLORS.surface,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  actionButtonFound: {
    backgroundColor: APP_COLORS.surface,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  actionText: { fontSize: 13, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.text,
    paddingVertical: 0,
  },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: APP_COLORS.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 14,
    marginBottom: 10,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
  },
  toggleLost: { backgroundColor: APP_COLORS.lost },
  toggleFound: { backgroundColor: APP_COLORS.found },
  toggleText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textMuted },
  toggleTextActive: { color: APP_COLORS.surface },
  feedCount: { color: APP_COLORS.textLight, fontSize: 12, fontWeight: '600' },
  chipsRow: {
    paddingHorizontal: 0,
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  chipActive: {
    backgroundColor: APP_COLORS.accentLight,
    borderColor: APP_COLORS.primary,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: APP_COLORS.textMuted },
  chipTextActive: { color: APP_COLORS.primary },
  clearButton: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearButtonText: {
    color: APP_COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  locationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationTitle: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  locationTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  locationChipsRow: {
    gap: 8,
    marginBottom: 14,
  },
  locationChip: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  locationChipActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  locationChipText: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  locationChipTextActive: {
    color: APP_COLORS.surface,
  },
  listContent: { paddingHorizontal: 14, paddingBottom: 30 },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: APP_COLORS.text, marginBottom: 6 },
  emptySub: { color: APP_COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

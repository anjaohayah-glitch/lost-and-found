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
import type { Post, PostType } from '../../src/types/post';
import { buildMockPosts } from '../../src/utils/helpers';
import { resolvePostDate } from '../../src/utils/timeAgo';
import { useStore } from '../../store/useStore';
import { hapticLight } from '../../utils/haptics';

const CATEGORIES = [{ label: 'All', value: 'all', icon: 'apps-outline' as const }, ...CATEGORY_OPTIONS];

export default function HomeScreen() {
  const router = useRouter();
  const networkState = Network.useNetworkState();
  const { drawerOpen, filter, setDrawerOpen, setFilter, setIsOffline, profile, unreadCount } = useStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

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
          p.location?.toLowerCase().includes(q),
      );
    }
    if (category !== 'all') {
      result = result.filter((p) => p.category?.toLowerCase() === category);
    }
    return result;
  }, [posts, search, category]);

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
      <View style={styles.header}>
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
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={16} color={APP_COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search lost & found items..."
                placeholderTextColor={APP_COLORS.textLight}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.hero}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.heroTitle}>Home Feed</Text>
                  <Text style={styles.heroSub}>Approved lost and found reports</Text>
                </View>
                <TouchableOpacity onPress={handleAvatarPress} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(profile?.name ?? 'U').charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>

              {isOffline && (
                <View style={styles.offlineBar}>
                  <Ionicons name="wifi-outline" size={13} color="#92400E" />
                  <Text style={styles.offlineText}>Offline, showing cached posts</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonLost]}
                  onPress={() => handleCreate('lost')}
                  activeOpacity={0.82}
                >
                  <Ionicons name="search-outline" size={15} color={APP_COLORS.lost} />
                  <Text style={[styles.actionText, { color: APP_COLORS.lost }]}>Lost</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonFound]}
                  onPress={() => handleCreate('found')}
                  activeOpacity={0.82}
                >
                  <Ionicons name="hand-left-outline" size={15} color={APP_COLORS.found} />
                  <Text style={[styles.actionText, { color: APP_COLORS.found }]}>Found</Text>
                </TouchableOpacity>
              </View>
            </View>

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
                      color={isActive ? APP_COLORS.lost : APP_COLORS.textMuted}
                    />
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {cat.label}
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
            <Ionicons name="paw-outline" size={52} color={APP_COLORS.primary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              {search ? 'No results found' : 'Nothing here yet'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? `Try a different keyword or clear the search.`
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
  safe: { flex: 1, backgroundColor: '#F7F7F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.surface,
    letterSpacing: 0.4,
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
  hero: {
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  heroSub: { color: APP_COLORS.textMuted, fontSize: 13 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: APP_COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  avatarText: { color: APP_COLORS.primary, fontWeight: '800', fontSize: 15 },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
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
    backgroundColor: APP_COLORS.lostLight,
    borderLeftColor: APP_COLORS.lost,
    borderColor: APP_COLORS.lostBorder,
  },
  actionButtonFound: {
    backgroundColor: APP_COLORS.foundLight,
    borderLeftColor: APP_COLORS.found,
    borderColor: APP_COLORS.foundBorder,
  },
  actionText: { fontSize: 13, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.text,
    paddingVertical: 0,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 30,
    padding: 3,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 30,
  },
  toggleLost: { backgroundColor: APP_COLORS.lost },
  toggleFound: { backgroundColor: APP_COLORS.found },
  toggleText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textMuted },
  toggleTextActive: { color: APP_COLORS.surface },
  feedCount: { color: APP_COLORS.textLight, fontSize: 12, fontWeight: '600' },
  chipsRow: {
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  chipActive: {
    backgroundColor: APP_COLORS.lostLight,
    borderColor: APP_COLORS.lost,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: APP_COLORS.textMuted },
  chipTextActive: { color: APP_COLORS.lost },
  listContent: { paddingHorizontal: 14, paddingBottom: 30 },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: APP_COLORS.text, marginBottom: 6 },
  emptySub: { color: APP_COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { auth, db, firebaseReady } from '../../services/firebase';
import { APP_COLORS } from '../../src/constants/colors';
import type { TimestampLike } from '../../src/types/post';
import { formatPostDate, resolvePostDate } from '../../src/utils/timeAgo';
import { useStore } from '../../store/useStore';
import { hapticLight } from '../../utils/haptics';

interface Conversation {
  id: string;
  participantIds: string[];
  participantNames?: Record<string, string>;
  postId?: string | null;
  postTitle?: string | null;
  postStatus?: string | null;
  lastMessage?: string | null;
  lastMessageAt: TimestampLike;
  unreadBy?: string[];
}

// ── Avatar color pool based on name initial ──
const AVATAR_COLORS = [
  { bg: '#FEF2F2', text: APP_COLORS.primary },
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#F0FFF4', text: '#16A34A' },
  { bg: '#F5F3FF', text: '#7C3AED' },
  { bg: '#FFFBEB', text: '#B45309' },
];

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Gets the OTHER person's name, not the current user ──
function getOtherName(
  participantNames: Record<string, string> | undefined,
  participantIds: string[],
  uid: string,
): string {
  if (!participantNames) return 'Campus member';
  const otherId = participantIds.find((id) => id !== uid);
  if (otherId && participantNames[otherId]) return participantNames[otherId];
  // fallback: just grab first value that isn't the current user's name
  const values = Object.entries(participantNames)
    .filter(([id]) => id !== uid)
    .map(([, name]) => name);
  return values[0] ?? 'Campus member';
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-1',
    participantIds: ['demo-user', 'mika'],
    participantNames: { 'demo-user': 'You', mika: 'Mika Santos' },
    postId: 'demo-lost-1',
    postTitle: 'Black Samsung phone with cracked case',
    lastMessage: 'Can you confirm the wallpaper before we meet near the library?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 18),
    unreadBy: ['demo-user'],
  },
  {
    id: 'demo-2',
    participantIds: ['demo-user', 'security'],
    participantNames: { 'demo-user': 'You', security: 'Campus Security' },
    postId: 'demo-found-2',
    postTitle: 'Set of keys with fox keychain',
    lastMessage: 'We have the keys at the front desk until 5 PM.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    unreadBy: ['demo-user'],
  },
  {
    id: 'demo-3',
    participantIds: ['demo-user', 'juan'],
    participantNames: { 'demo-user': 'You', juan: 'Juan Reyes' },
    postId: 'demo-lost-3',
    postTitle: 'CTU ID — Maria Santos',
    lastMessage: 'Thanks! I already picked it up.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    unreadBy: [],
  },
  {
    id: 'demo-4',
    participantIds: ['demo-user', 'admin'],
    participantNames: { 'demo-user': 'You', admin: 'Admin' },
    postId: 'demo-lost-4',
    postTitle: 'Your post — Lost Wallet',
    lastMessage: 'Your post has been approved and is now live.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    unreadBy: [],
  },
];

type FilterTab = 'all' | 'unread' | 'mine';

export default function MessagesScreen() {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const currentUser = auth?.currentUser ?? null;
  const activeUid = profile?.uid ?? currentUser?.uid ?? null;
  const uid = activeUid ?? 'demo-user';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // ── Real-time Firestore listener ──
  useEffect(() => {
    if (!firebaseReady || !db) {
      setLoadError(false);
      setLoading(false);
      setConversations(DEMO_CONVERSATIONS);
      return;
    }

    if (!activeUid) {
      setLoadError(false);
      setLoading(false);
      setConversations([]);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', activeUid),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLoadError(false);
        setLoading(false);
        const data = snap.docs
          .map(
            (doc) =>
              ({ id: doc.id, ...(doc.data() as Omit<Conversation, 'id'>) }) satisfies Conversation,
          )
          .sort((a, b) => {
            const aTime = resolvePostDate(a.lastMessageAt)?.getTime() ?? 0;
            const bTime = resolvePostDate(b.lastMessageAt)?.getTime() ?? 0;
            return bTime - aTime;
          });
        setConversations(data);
      },
      (error) => {
        console.error('messages listener error:', error);
        setLoadError(true);
        setLoading(false);
        setConversations([]);
      },
    );

    return unsub;
  }, [activeUid]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unreadBy?.includes(uid)).length,
    [conversations, uid],
  );

  // ── Search + tab filter ──
  const filtered = useMemo(() => {
    let result = conversations;

    if (activeTab === 'unread') {
      result = result.filter((c) => c.unreadBy?.includes(uid));
    } else if (activeTab === 'mine') {
      result = result.filter((c) => c.postId?.startsWith('lost'));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          getOtherName(c.participantNames, c.participantIds, uid).toLowerCase().includes(q) ||
          c.postTitle?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [conversations, activeTab, search, uid]);

  const handleOpen = (item: Conversation) => {
    hapticLight();
    // Navigate to the actual chat thread, not the post detail
    router.push(`/chat/${item.id}`);
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'mine', label: 'Mine' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Messages</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => {
              hapticLight();
              setActiveTab(tab.key);
            }}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Conversation list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            colors={[APP_COLORS.primary]}
            tintColor={APP_COLORS.primary}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
            }}
          />
        }
        renderItem={({ item }) => {
          const isUnread = item.unreadBy?.includes(uid);
          const otherName = getOtherName(item.participantNames, item.participantIds, uid);
          const initials = getInitials(otherName);
          const avatarColor = getAvatarColor(otherName);

          return (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              style={[styles.card, isUnread && styles.cardUnread]}
              activeOpacity={0.75}
            >
              {/* ── Initials avatar ── */}
              <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
                <Text style={[styles.avatarText, { color: avatarColor.text }]}>
                  {initials}
                </Text>
              </View>

              {/* ── Card body ── */}
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text numberOfLines={1} style={styles.cardName}>
                    {otherName}
                  </Text>
                  <Text style={styles.cardTime}>
                    {formatPostDate(item.lastMessageAt)}
                  </Text>
                </View>

                {item.postTitle && (
                  <View style={styles.postTitleRow}>
                    <Text numberOfLines={1} style={styles.cardPostTitle}>
                      re: {item.postTitle}
                    </Text>
                    {item.postStatus === 'resolved' ? (
                      <View style={styles.resolvedPill}>
                        <Text style={styles.resolvedPillText}>Resolved</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <Text
                  numberOfLines={2}
                  style={[styles.cardPreview, isUnread && styles.cardPreviewUnread]}
                >
                  {item.lastMessage ?? 'Open to see the conversation.'}
                </Text>
              </View>

              {/* ── Unread dot ── */}
              {isUnread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={
                loading
                  ? 'sync-outline'
                  : loadError
                    ? 'alert-circle-outline'
                    : 'chatbubble-ellipses-outline'
              }
              size={52}
              color={loadError ? APP_COLORS.lost : APP_COLORS.primary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              {loading
                ? 'Loading messages...'
                : loadError
                  ? 'Messages unavailable'
                  : search
                    ? 'No results found'
                    : 'No messages yet'}
            </Text>
            <Text style={styles.emptySub}>
              {loading
                ? 'Checking your conversations.'
                : search
                ? 'Try a different name or keyword.'
                : !auth?.currentUser
                ? 'Sign in to see messages about your lost and found reports.'
                : loadError
                ? 'Messages need updated Firestore rules. Deploy the latest rules, then try again.'
                : 'When someone contacts you about a post, it will appear here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.background },

  /* ── Header ── */
  header: {
    backgroundColor: APP_COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  unreadPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  unreadPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Search ── */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 0,
  },

  /* ── Filter tabs ── */
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  tabActive: {
    backgroundColor: APP_COLORS.lostLight,
    borderColor: APP_COLORS.primary,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textMuted },
  tabTextActive: { color: APP_COLORS.primary },

  /* ── List ── */
  listContent: { paddingHorizontal: 14, paddingBottom: 30 },

  /* ── Card ── */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 13,
    marginBottom: 12,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: APP_COLORS.primary,
    borderRadius: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },

  /* ── Avatar ── */
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },

  /* ── Body ── */
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: APP_COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  cardTime: { fontSize: 11, color: APP_COLORS.textLight },
  cardPostTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.primary,
  },
  postTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  resolvedPill: {
    backgroundColor: APP_COLORS.foundLight,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  resolvedPillText: {
    color: APP_COLORS.found,
    fontSize: 9,
    fontWeight: '800',
  },
  cardPreview: {
    fontSize: 13,
    color: APP_COLORS.textMuted,
    lineHeight: 18,
  },
  cardPreviewUnread: {
    color: APP_COLORS.text,
    fontWeight: '700',
  },

  /* ── Unread dot ── */
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: APP_COLORS.primary,
    marginLeft: 8,
    flexShrink: 0,
  },

  /* ── Empty ── */
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: APP_COLORS.text,
    marginBottom: 6,
  },
  emptySub: {
    color: APP_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db, firebaseReady } from '../services/firebase';
import CategoryIcon from '../src/components/CategoryIcon';
import { getCategoryLabel } from '../src/constants/categories';
import { APP_COLORS } from '../src/constants/colors';
import type { Post } from '../src/types/post';
import { formatPostDate } from '../src/utils/timeAgo';
import { useStore } from '../store/useStore';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!id || !db) {
      setLoading(false);
      return;
    }

    getDoc(doc(db, 'posts', id))
      .then((snap) => {
        if (snap.exists()) {
          setPost({ id: snap.id, ...(snap.data() as Omit<Post, 'id'>) });
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setImageFailed(false);
  }, [post?.id, post?.imageUrl]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={APP_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Not Found</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Ionicons name="search-outline" size={52} color={APP_COLORS.textLight} style={styles.notFoundIcon} />
          <Text style={styles.notFoundText}>This post could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLost = post.type === 'lost';
  const accentColor = isLost ? APP_COLORS.lost : APP_COLORS.found;
  const accentBackground = isLost ? APP_COLORS.lostLight : APP_COLORS.foundLight;
  const accentBorder = isLost ? APP_COLORS.lostBorder : APP_COLORS.foundBorder;
  const isOwner = Boolean(auth?.currentUser?.uid && post.userId === auth.currentUser.uid);
  const isResolved = post.status === 'resolved';
  const canResolve = isOwner && post.status === 'approved';

  const handleContactPoster = async () => {
    const user = auth?.currentUser;

    if (!firebaseReady || !db || !user) {
      router.push('/login');
      return;
    }

    if (!post.userId) {
      Alert.alert('Unavailable', 'This post does not have a contactable owner.');
      return;
    }

    if (post.userId === user.uid) {
      Alert.alert('Your Post', 'This report belongs to you.');
      return;
    }

    try {
      const participantIds = [user.uid, post.userId].sort();
      const conversationId = `${post.id}_${participantIds.join('_')}`;

      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          participantIds,
          participantNames: {
            [user.uid]: profile?.name ?? user.displayName ?? user.email ?? 'Campus Member',
            [post.userId]: post.userName,
          },
          postId: post.id,
          postTitle: post.title,
          postType: post.type,
          postLocation: post.location,
          postStatus: post.status,
          lastMessage: null,
          lastMessageAt: serverTimestamp(),
          unreadBy: [],
        },
        { merge: true },
      );

      router.push(`/chat/${conversationId}`);
    } catch (error) {
      Alert.alert(
        'Message Failed',
        error instanceof Error ? error.message : 'Could not open this conversation.',
      );
    }
  };

  const handleResolvePost = () => {
    const firestore = db;
    const user = auth?.currentUser;

    if (!firestore || !user || !post.id) {
      Alert.alert('Unavailable', 'Please sign in before marking this post resolved.');
      return;
    }

    Alert.alert(
      'Mark Resolved',
      `Mark "${post.title}" as returned or claimed? It will be hidden from the home feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          onPress: async () => {
            try {
              await updateDoc(doc(firestore, 'posts', post.id), {
                status: 'resolved',
                resolvedAt: serverTimestamp(),
                resolvedBy: user.uid,
              });

              setPost((current) =>
                current
                  ? {
                      ...current,
                      status: 'resolved',
                      resolvedAt: new Date(),
                      resolvedBy: user.uid,
                    }
                  : current,
              );

              Alert.alert('Resolved', 'This post is now hidden from the home feed.');
            } catch (error) {
              Alert.alert(
                'Resolve Failed',
                error instanceof Error
                  ? error.message
                  : 'This post could not be marked resolved.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {post.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.heroFallback, { backgroundColor: accentBackground }]}>
            <CategoryIcon category={post.category} size={72} color={accentColor} />
            <Text style={styles.heroFallbackText}>No photo attached</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: accentBackground,
                  borderColor: accentBorder,
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
            <View style={styles.categoryBadge}>
              <CategoryIcon category={post.category} size={12} color={APP_COLORS.textMuted} />
              <Text style={styles.categoryBadgeText}>
                {getCategoryLabel(post.category)}
              </Text>
            </View>
            {isResolved ? (
              <View style={styles.resolvedBadge}>
                <Ionicons name="checkmark-done-outline" size={12} color={APP_COLORS.primary} />
                <Text style={styles.resolvedBadgeText}>RESOLVED</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Location</Text>
              <View style={styles.metaValueRow}>
                <Ionicons name="location-outline" size={15} color={APP_COLORS.text} />
                <Text style={styles.metaValue}>{post.location}</Text>
              </View>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Posted by</Text>
              <View style={styles.metaValueRow}>
                <Ionicons name="person-outline" size={15} color={APP_COLORS.text} />
                <Text style={styles.metaValue}>{post.userName}</Text>
              </View>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Date posted</Text>
              <Text style={styles.metaValue}>{formatPostDate(post.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionText}>{post.description}</Text>
          </View>

          {canResolve ? (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: APP_COLORS.primary }]}
              activeOpacity={0.85}
              onPress={handleResolvePost}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
              <Text style={styles.ctaButtonText}>Mark as Resolved</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.ctaButton,
                { backgroundColor: isResolved ? APP_COLORS.textLight : accentColor },
              ]}
              activeOpacity={0.85}
              onPress={() => void handleContactPoster()}
              disabled={isOwner || isResolved}
            >
              <Ionicons
                name={
                  isResolved
                    ? 'checkmark-done-outline'
                    : isOwner
                      ? 'person-outline'
                      : 'chatbubble-ellipses-outline'
                }
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.ctaButtonText}>
                {isResolved
                  ? 'Post Resolved'
                  : isOwner
                    ? 'This Is Your Post'
                    : 'Contact Poster'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 300,
    backgroundColor: APP_COLORS.surfaceAlt,
  },
  heroFallback: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroFallbackText: {
    fontSize: 14,
    color: APP_COLORS.textMuted,
  },
  body: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: APP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: APP_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resolvedBadgeText: {
    color: APP_COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: APP_COLORS.text,
    lineHeight: 32,
    marginBottom: 16,
  },
  metaGrid: {
    gap: 8,
    marginBottom: 16,
  },
  metaCard: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaValue: {
    fontSize: 14,
    color: APP_COLORS.text,
  },
  section: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    color: APP_COLORS.textMuted,
    lineHeight: 23,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notFoundIcon: {
    marginBottom: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
  },
});

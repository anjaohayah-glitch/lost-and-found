import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORY_ICONS, getCategoryLabel } from '../constants/categories';
import { APP_COLORS } from '../constants/colors';
import { RootStackScreenProps } from '../navigation/types';
import { getComposerRoute, getOppositeType } from '../utils/helpers';
import { formatPostDate } from '../utils/timeAgo';

export default function PostDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'PostDetail'>) {
  const { post } = route.params;
  const isLost = post.type === 'lost';
  const accentColor = isLost ? APP_COLORS.lost : APP_COLORS.found;
  const accentBackground = isLost ? APP_COLORS.lostLight : APP_COLORS.foundLight;
  const accentBorder = isLost ? APP_COLORS.lostBorder : APP_COLORS.foundBorder;
  const oppositeType = getOppositeType(post.type);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { borderColor: accentBorder, backgroundColor: accentBackground }]}>
          {post.imageUrl ? (
            <Image source={{ uri: post.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroEmoji}>{CATEGORY_ICONS[post.category] ?? ''}</Text>
              <Text style={styles.heroFallbackText}>{getCategoryLabel(post.category)}</Text>
            </View>
          )}
        </View>

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
            <Text style={[styles.typeBadgeText, { color: accentColor }]}>
              {isLost ? ' LOST' : ' FOUND'}
            </Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{getCategoryLabel(post.category)}</Text>
          </View>
        </View>

        <Text style={styles.title}>{post.title}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}> {post.location}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Posted by</Text>
            <Text style={styles.metaValue}> {post.userName}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Posted</Text>
            <Text style={styles.metaValue}>{formatPostDate(post.createdAt)}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{post.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>{post.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Step</Text>
          <Text style={styles.sectionText}>
            {isLost
              ? 'If you found something that might match this post, submit a found-item report with the details you have.'
              : 'If this looks like something you lost, submit a lost-item report with extra identifying details so admins can help verify a match.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: accentColor }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(getComposerRoute(oppositeType))}
        >
          <Text style={styles.ctaButtonText}>
            {isLost ? 'I Found Something Like This' : 'I Lost Something Like This'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
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
  backArrow: {
    fontSize: 22,
    color: APP_COLORS.text,
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
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 260,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  heroEmoji: {
    fontSize: 68,
    marginBottom: 12,
  },
  heroFallbackText: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.text,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: APP_COLORS.text,
    lineHeight: 32,
    marginBottom: 16,
  },
  metaGrid: {
    gap: 10,
    marginBottom: 18,
  },
  metaCard: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 14,
    color: APP_COLORS.text,
    lineHeight: 20,
  },
  section: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: APP_COLORS.textMuted,
    lineHeight: 22,
  },
  ctaButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CategoryIcon from '../src/components/CategoryIcon';
import { getCategoryLabel } from '../src/constants/categories';
import { APP_COLORS } from '../src/constants/colors';
import type { Post } from '../src/types/post';
import timeAgo from '../src/utils/timeAgo';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  disableNav?: boolean;
}

export default function PostCard({ post, onPress, disableNav }: PostCardProps) {
  const router = useRouter();
  const isLost = post.type === 'lost';
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [post.id, post.imageUrl]);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (!disableNav) {
      router.push(`/post-detail?id=${post.id}`);
    }
  };

  const interactive = Boolean(onPress) || !disableNav;

  const cardContent = (
    <>
      {post.imageUrl && !imageFailed ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.image}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.image,
            styles.imageFallback,
            {
              backgroundColor: isLost
                ? APP_COLORS.lostLight
                : APP_COLORS.foundLight,
            },
          ]}
        >
          <CategoryIcon
            category={post.category}
            size={44}
            color={isLost ? APP_COLORS.lost : APP_COLORS.found}
          />
          <Text style={styles.imageFallbackLabel}>
            {getCategoryLabel(post.category)}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isLost
                  ? APP_COLORS.lostLight
                  : APP_COLORS.foundLight,
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: isLost ? APP_COLORS.lost : APP_COLORS.found },
              ]}
            >
              {post.type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
        <Text style={styles.meta}>{getCategoryLabel(post.category)}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {post.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="location-outline" size={12} color={APP_COLORS.textLight} />
            <Text style={styles.footerText}>{post.location}</Text>
          </View>
          <Text style={styles.footerDot}>.</Text>
          <View style={styles.footerItem}>
            <Ionicons name="person-outline" size={12} color={APP_COLORS.textLight} />
            <Text style={styles.footerText}>{post.userName}</Text>
          </View>
        </View>
      </View>
    </>
  );

  if (!interactive) {
    return <View style={styles.card}>{cardContent}</View>;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {cardContent}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageFallbackLabel: {
    fontSize: 13,
    color: APP_COLORS.textMuted,
    fontWeight: '600',
  },
  body: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  time: {
    color: APP_COLORS.textLight,
    fontSize: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: APP_COLORS.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  meta: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  description: {
    color: APP_COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerText: {
    color: APP_COLORS.textLight,
    fontSize: 12,
  },
  footerDot: {
    color: APP_COLORS.textLight,
    fontSize: 12,
  },
});

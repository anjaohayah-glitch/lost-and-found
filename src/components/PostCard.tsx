import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CATEGORY_ICONS } from '../constants/categories';
import { APP_COLORS } from '../constants/colors';
import { RootStackNavigationProp } from '../navigation/types';
import { Post } from '../types/post';
import timeAgo from '../utils/timeAgo';

interface PostCardProps {
  post: Post;
  index: number;
  navigation: RootStackNavigationProp;
}

export default function PostCard({ post, index, navigation }: PostCardProps) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const isLost = post.type === 'lost';

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index * 50, 200),
      useNativeDriver: true,
    }).start();
  }, [entranceAnim, index]);

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: entranceAnim,
        transform: [
          { scale: pressAnim },
          {
            translateY: entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={styles.card}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => navigation.navigate('PostDetail', { post })}
        activeOpacity={1}
      >
        <View
          style={[
            styles.typeBadgeStrip,
            { backgroundColor: isLost ? APP_COLORS.lost : APP_COLORS.found },
          ]}
        />

        <View style={styles.cardInner}>
          <View
            style={[
              styles.imageBox,
              {
                backgroundColor: isLost ? APP_COLORS.lostLight : APP_COLORS.foundLight,
              },
            ]}
          >
            {post.imageUrl ? (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            ) : (
              <Text style={styles.categoryIcon}>{CATEGORY_ICONS[post.category] ?? ''}</Text>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.topRow}>
              <View
                style={[
                  styles.typePill,
                  {
                    backgroundColor: isLost ? APP_COLORS.lostLight : APP_COLORS.foundLight,
                    borderColor: isLost ? APP_COLORS.lostBorder : APP_COLORS.foundBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    { color: isLost ? APP_COLORS.lost : APP_COLORS.found },
                  ]}
                >
                  {isLost ? ' LOST' : ' FOUND'}
                </Text>
              </View>
              <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
            </View>

            <Text style={styles.postTitle} numberOfLines={2}>
              {post.title}
            </Text>

            <Text style={styles.postDesc} numberOfLines={2}>
              {post.description}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaItem}> {post.location}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaItem}> {post.userName}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  typeBadgeStrip: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  imageBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: APP_COLORS.textLight,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 3,
    lineHeight: 19,
  },
  postDesc: {
    fontSize: 12,
    color: APP_COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  metaItem: {
    fontSize: 11,
    color: APP_COLORS.textLight,
  },
  metaDot: {
    fontSize: 11,
    color: APP_COLORS.textLight,
    marginHorizontal: 2,
  },
});


import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import DrawerMenu from '../components/DrawerMenu';
import PostCard from '../components/PostCard';
import { APP_COLORS } from '../constants/colors';
import { db, firebaseReady } from '../config/firebase';
import { RootStackScreenProps } from '../navigation/types';
import { Post, PostType } from '../types/post';
import { buildMockPosts, getComposerRoute } from '../utils/helpers';

export default function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const [activeTab, setActiveTab] = useState<PostType>('lost');
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchTab = (tab: PostType) => {
    if (tab === activeTab) {
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(tabIndicatorAnim, {
        toValue: tab === 'lost' ? 0 : 1,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setActiveTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    const firestore = db;

    if (!firebaseReady || !firestore) {
      setPosts(buildMockPosts(activeTab));
      return;
    }

    const postsQuery = query(
      collection(firestore, 'posts'),
      where('status', '==', 'approved'),
      where('type', '==', activeTab),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...(doc.data() as Omit<Post, 'id'>),
            }) satisfies Post
        );

        setPosts(data);
      },
      () => {
        setPosts(buildMockPosts(activeTab));
      }
    );

    return unsubscribe;
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    if (!firebaseReady) {
      setPosts(buildMockPosts(activeTab));
    }

    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, [activeTab]);

  const tabIndicatorLeft = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '52%'],
  });

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>{activeTab === 'lost' ? '' : ''}</Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'lost' ? 'No lost items yet' : 'No found items yet'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'lost'
          ? 'Lost something? Post it and let the community help.'
          : 'Found something? Post it so the owner has a better chance of getting it back.'}
      </Text>
      <TouchableOpacity
        style={[
          styles.emptyBtn,
          {
            backgroundColor: activeTab === 'lost' ? APP_COLORS.lost : APP_COLORS.found,
          },
        ]}
        onPress={() => navigation.navigate(getComposerRoute(activeTab))}
      >
        <Text style={styles.emptyBtnText}>
          {activeTab === 'lost' ? '+ Report Lost Item' : '+ Report Found Item'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.feedHeader}>
      <Text style={styles.feedTitle}>
        {activeTab === 'lost' ? ' Lost Items' : ' Found Items'}
      </Text>
      <Text style={styles.feedCount}>
        {posts.length} post{posts.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const listHeader = (
    <>
      {!firebaseReady ? (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerTitle}>Demo feed enabled</Text>
          <Text style={styles.demoBannerText}>
            Live Firebase keys are still blank, so this screen is showing sample approved posts.
          </Text>
        </View>
      ) : null}
      {posts.length > 0 ? renderHeader() : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={APP_COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 18 }]} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <Text style={styles.foxEmoji}></Text>
          <Text style={styles.appTitle}>Lost&Found</Text>
        </View>

        <TouchableOpacity
          style={styles.postFab}
          onPress={() => navigation.navigate(getComposerRoute(activeTab))}
        >
          <Text style={styles.postFabText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabTrack}>
          <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
          <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab('lost')} activeOpacity={0.8}>
            <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>
               Lost Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => switchTab('found')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'found' && styles.tabTextActive]}>
               Found Items
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PostCard post={item} index={index} navigation={navigation} />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={APP_COLORS.primary}
              colors={[APP_COLORS.primary]}
            />
          }
        />
      </Animated.View>

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
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
    paddingVertical: 12,
    backgroundColor: APP_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    gap: 5,
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    backgroundColor: APP_COLORS.text,
    borderRadius: 2,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foxEmoji: {
    fontSize: 22,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.primary,
    letterSpacing: -0.5,
  },
  postFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  postFabText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '400',
    lineHeight: 24,
    marginTop: -1,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.background,
  },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    position: 'relative',
    height: 46,
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    width: '46%',
    height: 40,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 11,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  demoBanner: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  demoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  demoBannerText: {
    fontSize: 12,
    color: APP_COLORS.textMuted,
    lineHeight: 18,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  feedCount: {
    fontSize: 12,
    color: APP_COLORS.textMuted,
    backgroundColor: APP_COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});


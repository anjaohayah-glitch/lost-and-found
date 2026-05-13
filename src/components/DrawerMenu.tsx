import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { APP_COLORS } from '../constants/colors';
import { auth, firebaseReady } from '../config/firebase';
import { RootStackNavigationProp, RootStackParamList } from '../navigation/types';

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
  navigation: RootStackNavigationProp;
}

type MenuRoute = keyof Pick<RootStackParamList, 'Home' | 'LostPost' | 'FoundPost'>;

const MENU_ITEMS: Array<{
  emoji: string;
  label: string;
  subtitle: string;
  route: MenuRoute;
}> = [
  {
    emoji: '',
    label: 'Home Feed',
    subtitle: 'Browse recent lost and found posts',
    route: 'Home',
  },
  {
    emoji: '',
    label: 'Report Lost',
    subtitle: 'Create a new lost-item post',
    route: 'LostPost',
  },
  {
    emoji: '',
    label: 'Report Found',
    subtitle: 'Help return something to its owner',
    route: 'FoundPost',
  },
];

export default function DrawerMenu({ open, onClose, navigation }: DrawerMenuProps) {
  const slideAnim = useRef(new Animated.Value(320)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMounted(false);
    });
  }, [backdropAnim, open, slideAnim]);

  if (!isMounted) {
    return null;
  }

  const currentUser = auth?.currentUser;

  return (
    <Modal transparent visible={isMounted} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <View style={styles.logoBubble}>
              <Text style={styles.logoEmoji}></Text>
            </View>
            <Text style={styles.title}>FoxFindz</Text>
            <Text style={styles.subtitle}>
              {currentUser?.displayName ?? currentUser?.email ?? 'Campus lost and found'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{firebaseReady ? 'Live Firebase' : 'Demo Mode'}</Text>
            <Text style={styles.statusText}>
              {firebaseReady
                ? 'Posts are loading from your Firestore collection.'
                : 'Add Firebase keys in app config to switch from mock data to live posts.'}
            </Text>
          </View>

          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.menuItem}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  navigation.navigate(item.route);
                }}
              >
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.closeButton} activeOpacity={0.85} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close Menu</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 0, 0.32)',
  },
  drawer: {
    width: 300,
    maxWidth: '82%',
    height: '100%',
    backgroundColor: APP_COLORS.surface,
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    marginBottom: 18,
  },
  logoBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: APP_COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: APP_COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: APP_COLORS.textMuted,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusText: {
    fontSize: 12,
    color: APP_COLORS.textMuted,
    lineHeight: 18,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    gap: 12,
  },
  menuEmoji: {
    fontSize: 20,
  },
  menuCopy: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: APP_COLORS.textMuted,
    lineHeight: 17,
  },
  menuArrow: {
    fontSize: 24,
    color: APP_COLORS.textLight,
  },
  closeButton: {
    marginTop: 'auto',
    backgroundColor: APP_COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});


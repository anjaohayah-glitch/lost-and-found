import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { APP_COLORS } from '../src/constants/colors';
import { auth } from '../services/firebase';
import { useStore } from '../store/useStore';
import { hapticLight } from '../utils/haptics';
import FoxLogo from './FoxLogo';

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function DrawerMenu({ open, onClose }: DrawerMenuProps) {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const translateX = useRef(new Animated.Value(-320)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: open ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: open ? 0 : -320,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, overlayOpacity, translateX]);

  const navigate = (path: Href) => {
    hapticLight();
    onClose();
    router.push(path);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={open}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Animated.View
          style={[styles.panel, { transform: [{ translateX }] }]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <FoxLogo size={34} />
            </View>
            <Text style={styles.title}>FoxFindz</Text>
          </View>
          <Text style={styles.subtitle}>
            {profile?.name ?? auth?.currentUser?.email ?? 'Campus lost and found'}
          </Text>

          <TouchableOpacity
            onPress={() => navigate('/(tabs)/home')}
            style={styles.item}
          >
            <Ionicons name="home-outline" size={17} color={APP_COLORS.textMuted} />
            <Text style={styles.itemText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigate('/lost-form')}
            style={styles.item}
          >
            <Ionicons name="search-outline" size={17} color={APP_COLORS.textMuted} />
            <Text style={styles.itemText}>Report Lost Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigate('/found-form')}
            style={styles.item}
          >
            <Ionicons name="hand-left-outline" size={17} color={APP_COLORS.textMuted} />
            <Text style={styles.itemText}>Report Found Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigate('/(tabs)/notifications')}
            style={styles.item}
          >
            <Ionicons name="notifications-outline" size={17} color={APP_COLORS.textMuted} />
            <Text style={styles.itemText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigate('/(tabs)/settings')}
            style={styles.item}
          >
            <Ionicons name="settings-outline" size={17} color={APP_COLORS.textMuted} />
            <Text style={styles.itemText}>Settings</Text>
          </TouchableOpacity>
          {profile?.role === 'admin' ? (
            <TouchableOpacity
              onPress={() => navigate('/admin')}
              style={styles.item}
            >
              <Ionicons name="speedometer-outline" size={17} color={APP_COLORS.textMuted} />
              <Text style={styles.itemText}>Admin Dashboard</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 26, 29, 0.28)',
  },
  panel: {
    width: 290,
    maxWidth: '82%',
    height: '100%',
    backgroundColor: APP_COLORS.surface,
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceAlt,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: APP_COLORS.text,
  },
  subtitle: {
    color: APP_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  item: {
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginBottom: 10,
  },
  itemText: {
    color: APP_COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
  closeButton: {
    marginTop: 'auto',
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: APP_COLORS.surface,
    fontWeight: '800',
    fontSize: 14,
  },
});

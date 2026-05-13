import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import FoxLogo from '../components/FoxLogo';
import { auth, firebaseReady } from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';
import { useStore } from '../store/useStore';

export default function SplashScreen() {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (!firebaseReady) {
        router.replace('/(tabs)/home');
        return;
      }

      if (auth?.currentUser) {
        router.replace(profile?.role === 'admin' ? '/admin' : '/(tabs)/home');
        return;
      }

      router.replace('/login');
    }, 2200);

    return () => clearTimeout(timer);
  }, [fade, profile?.role, router, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fade, transform: [{ scale }] }]}>
        <View style={styles.logo}>
          <FoxLogo size={130} />
        </View>
        <Text style={styles.title}>FoxFindz</Text>
        <Text style={styles.subtitle}>Campus Lost & Found</Text>
      </Animated.View>

      <Animated.View style={[styles.dotsRow, { opacity: fade }]}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotMid]} />
        <View style={styles.dot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary,
  },
  inner: {
    alignItems: 'center',
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 30,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotMid: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});


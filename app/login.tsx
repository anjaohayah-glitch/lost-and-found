import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from '@firebase/auth';

import OfflineBanner from '../components/OfflineBanner';
import FoxLogo from '../components/FoxLogo';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  firebaseReady,
} from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';
import { hapticLight, hapticMedium, hapticWarning } from '../utils/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    hapticMedium();

    if (!firebaseReady || !auth) {
      Alert.alert('Demo Mode', FIREBASE_SETUP_MESSAGE);
      router.replace('/(tabs)/home');
      return;
    }

    if (!email.trim() || !password) {
      hapticWarning();
      Alert.alert(
        'Missing Fields',
        'Please enter your email and password.',
      );
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      Alert.alert('Login Failed', 'Wrong email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    hapticLight();

    if (!firebaseReady || !auth) {
      Alert.alert('Demo Mode', FIREBASE_SETUP_MESSAGE);
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      hapticWarning();
      Alert.alert('Email Required', 'Enter your email first so we can send the reset link.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert('Password Reset Sent', `Check ${trimmedEmail} for the reset link.`);
    } catch (error) {
      Alert.alert(
        'Reset Failed',
        error instanceof Error ? error.message : 'Password reset could not be sent.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {!firebaseReady ? (
          <OfflineBanner message={FIREBASE_SETUP_MESSAGE} tone="info" />
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <FoxLogo size={78} />
          </View>
          <Text style={styles.title}>FoxFindz</Text>
          <Text style={styles.subtitle}>A focused campus lost and found system for faster returns.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Welcome back</Text>
          <Text style={styles.panelText}>Sign in to see approvals, found-item notices, and messages.</Text>

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="University Email"
            placeholderTextColor={APP_COLORS.placeholder}
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={APP_COLORS.placeholder}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <TouchableOpacity
            disabled={loading}
            onPress={() => void handleLogin()}
            style={[styles.button, loading ? styles.buttonDisabled : null]}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loading}
            onPress={() => void handleForgotPassword()}
            style={styles.forgotButton}
          >
            <Ionicons name="mail-outline" size={16} color={APP_COLORS.primary} />
            <Text style={styles.forgotLink}>Send password reset email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              hapticLight();
              router.push('/register');
            }}
          >
            <Text style={styles.link}>Do not have an account? Register</Text>
          </TouchableOpacity>
        </View>

        {!firebaseReady ? (
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.demoLink}>Continue to demo feed</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: APP_COLORS.background,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    width: 96,
    elevation: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: APP_COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  panelTitle: {
    color: APP_COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  panelText: {
    color: APP_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: APP_COLORS.surface,
    color: APP_COLORS.text,
  },
  button: {
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: APP_COLORS.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    textAlign: 'center',
    color: APP_COLORS.primary,
    marginTop: 18,
    fontWeight: '600',
  },
  forgotLink: {
    color: APP_COLORS.primary,
    fontWeight: '700',
  },
  forgotButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
  },
  demoLink: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginTop: 12,
  },
});

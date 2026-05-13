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
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from '@firebase/auth';

import OfflineBanner from '../components/OfflineBanner';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  firebaseReady,
} from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!firebaseReady || !auth) {
      Alert.alert('Demo Mode', FIREBASE_SETUP_MESSAGE);
      router.replace('/(tabs)/home');
      return;
    }

    if (!email.trim() || !password) {
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

        <Text style={styles.title}>FoxFindz</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

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

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.link}>Do not have an account? Register</Text>
        </TouchableOpacity>

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
    padding: 28,
    backgroundColor: APP_COLORS.background,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: APP_COLORS.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginBottom: 30,
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
  demoLink: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginTop: 12,
  },
});

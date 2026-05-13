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
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import OfflineBanner from '../components/OfflineBanner';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';

const PROGRAMS = [
  'BIT Computer',
  'BIT Electrical',
  'BIT Mechatronics',
  'BIT Drafting',
  'BIT Electronics',
  'BSIT',
];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    program: '',
    yearLevel: '',
  });
  const [showPasswordTip, setShowPasswordTip] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRegister = async () => {
    if (!firebaseReady || !auth || !db) {
      Alert.alert('Setup Required', FIREBASE_SETUP_MESSAGE);
      return;
    }

    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email || !form.password) {
      Alert.alert(
        'Missing Fields',
        'Please fill in your name, email, and password.',
      );
      return;
    }

    if (!form.program || !form.yearLevel) {
      Alert.alert(
        'Missing Fields',
        'Please choose your program and year level.',
      );
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please use a valid email address.');
      return;
    }

    try {
      setLoading(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password,
      );

      await updateProfile(credential.user, {
        displayName: form.name.trim(),
      });

      await setDoc(doc(db, 'users', credential.user.uid), {
        name: form.name.trim(),
        email,
        program: form.program,
        yearLevel: form.yearLevel,
        role: 'user',
        isOnline: true,
        fcmToken: null,
        createdAt: serverTimestamp(),
      });

      await signOut(auth);

      Alert.alert('Success', 'Account created. Please sign in.', [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error) {
      let message =
        error instanceof Error ? error.message : 'Registration failed.';

      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'auth/email-already-in-use'
      ) {
        message = 'That email is already registered.';
      }

      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'auth/weak-password'
      ) {
        message = 'Password should be at least 6 characters.';
      }

      Alert.alert('Registration Error', message);
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

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join FoxFindz</Text>

        <TextInput
          onChangeText={(value) => updateField('name', value)}
          placeholder="Full Name"
          placeholderTextColor={APP_COLORS.placeholder}
          style={styles.input}
          value={form.name}
        />
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => updateField('email', value)}
          placeholder="University Email"
          placeholderTextColor={APP_COLORS.placeholder}
          style={styles.input}
          value={form.email}
        />

        <View>
          <TextInput
            onBlur={() => setShowPasswordTip(false)}
            onChangeText={(value) => updateField('password', value)}
            onFocus={() => setShowPasswordTip(true)}
            placeholder="Password"
            placeholderTextColor={APP_COLORS.placeholder}
            secureTextEntry
            style={styles.input}
            value={form.password}
          />
          {showPasswordTip ? (
            <View style={styles.tipBubble}>
              <Text style={styles.tipText}>
                Tip: you can use your student ID number if that matches your
                campus policy.
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.label}>Program</Text>
        <View style={styles.chipRow}>
          {PROGRAMS.map((program) => {
            const selected = form.program === program;

            return (
              <TouchableOpacity
                key={program}
                onPress={() => updateField('program', program)}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : null,
                ]}
              >
                <Text
                  style={selected ? styles.chipTextSelected : styles.chipText}
                >
                  {program}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Year Level</Text>
        <View style={styles.chipRow}>
          {YEAR_LEVELS.map((yearLevel) => {
            const selected = form.yearLevel === yearLevel;

            return (
              <TouchableOpacity
                key={yearLevel}
                onPress={() => updateField('yearLevel', yearLevel)}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : null,
                ]}
              >
                <Text
                  style={selected ? styles.chipTextSelected : styles.chipText}
                >
                  {yearLevel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void handleRegister()}
          style={[styles.button, loading ? styles.buttonDisabled : null]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
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
    padding: 24,
    backgroundColor: APP_COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: APP_COLORS.primary,
    textAlign: 'center',
    marginTop: 36,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
    backgroundColor: APP_COLORS.surface,
    color: APP_COLORS.text,
  },
  label: {
    fontWeight: '800',
    color: APP_COLORS.text,
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: APP_COLORS.surface,
  },
  chipSelected: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  chipText: {
    color: APP_COLORS.textMuted,
  },
  chipTextSelected: {
    color: APP_COLORS.surface,
    fontWeight: '700',
  },
  tipBubble: {
    backgroundColor: APP_COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: APP_COLORS.primary,
  },
  tipText: {
    color: APP_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: APP_COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: APP_COLORS.surface,
    fontWeight: '800',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    color: APP_COLORS.primary,
    marginTop: 20,
    fontWeight: '600',
  },
});

import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import OfflineBanner from '../components/OfflineBanner';
import FoxLogo from '../components/FoxLogo';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '../utils/haptics';

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
  const [dropdown, setDropdown] = useState<null | 'program' | 'yearLevel'>(null);
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRegister = async () => {
    hapticMedium();

    if (!firebaseReady || !auth || !db) {
      Alert.alert('Setup Required', FIREBASE_SETUP_MESSAGE);
      return;
    }

    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email || !form.password) {
      hapticWarning();
      Alert.alert(
        'Missing Fields',
        'Please fill in your name, email, and password.',
      );
      return;
    }

    if (!form.program || !form.yearLevel) {
      hapticWarning();
      Alert.alert(
        'Missing Fields',
        'Please choose your program and year level.',
      );
      return;
    }

    if (!email.includes('@')) {
      hapticWarning();
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

      hapticSuccess();
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

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <FoxLogo size={70} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your campus profile for organized item reports.</Text>
        </View>

        <View style={styles.formPanel}>
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

          <DropdownField
            label="Program"
            placeholder="Select program"
            value={form.program}
            onPress={() => {
              hapticLight();
              setDropdown('program');
            }}
          />

          <DropdownField
            label="Year Level"
            placeholder="Select year level"
            value={form.yearLevel}
            onPress={() => {
              hapticLight();
              setDropdown('yearLevel');
            }}
          />

          <TouchableOpacity
            disabled={loading}
            onPress={() => void handleRegister()}
            style={[styles.button, loading ? styles.buttonDisabled : null]}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            router.replace('/login');
          }}
        >
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setDropdown(null)}
        transparent
        visible={dropdown != null}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setDropdown(null)}>
          <Pressable style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>
              {dropdown === 'program' ? 'Select Program' : 'Select Year Level'}
            </Text>
            {(dropdown === 'program' ? PROGRAMS : YEAR_LEVELS).map((option) => {
              const selected =
                dropdown === 'program'
                  ? form.program === option
                  : form.yearLevel === option;

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    hapticLight();
                    updateField(dropdown === 'program' ? 'program' : 'yearLevel', option);
                    setDropdown(null);
                  }}
                  style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selected && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={APP_COLORS.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function DropdownField({
  label,
  onPress,
  placeholder,
  value,
}: {
  label: string;
  onPress: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.dropdownFieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.dropdownField}>
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={APP_COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 22,
    backgroundColor: APP_COLORS.background,
  },
  hero: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 22,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 90,
    justifyContent: 'center',
    marginBottom: 12,
    width: 90,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: APP_COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: APP_COLORS.textMuted,
    marginBottom: 6,
  },
  formPanel: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
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
  dropdownFieldWrap: {
    marginBottom: 12,
  },
  dropdownField: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 13,
  },
  dropdownValue: {
    color: APP_COLORS.text,
    flex: 1,
    fontWeight: '700',
  },
  dropdownPlaceholder: {
    color: APP_COLORS.placeholder,
    fontWeight: '500',
  },
  dropdownBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 10, 0, 0.32)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  dropdownCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  dropdownTitle: {
    color: APP_COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dropdownOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  dropdownOptionSelected: {
    backgroundColor: APP_COLORS.surfaceAlt,
  },
  dropdownOptionText: {
    color: APP_COLORS.textMuted,
    fontWeight: '700',
  },
  dropdownOptionTextSelected: {
    color: APP_COLORS.primary,
  },
  tipBubble: {
    backgroundColor: APP_COLORS.surfaceAlt,
    borderRadius: 8,
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

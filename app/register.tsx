import { useEffect, useMemo, useState } from 'react';
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
import type { User } from '@firebase/auth';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
} from '@firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import OfflineBanner from '../components/OfflineBanner';
import FoxLogo from '../components/FoxLogo';
import { clearDraft, loadDraft, saveDraft } from '../hooks/useOfflineQueue';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../services/firebase';
import { APP_COLORS } from '../src/constants/colors';
import { EULA_VERSION } from '../src/constants/eula';
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
const REGISTER_DRAFT_KEY = 'foxfindz_register_draft';

interface RegisterDraft {
  name: string;
  email: string;
  program: string;
  yearLevel: string;
  acceptedEula: boolean;
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [dropdown, setDropdown] = useState<null | 'program' | 'yearLevel'>(null);
  const [acceptedEula, setAcceptedEula] = useState(false);
  const [loading, setLoading] = useState(false);
  const registerDraft = useMemo<RegisterDraft>(
    () => ({
      name: form.name,
      email: form.email,
      program: form.program,
      yearLevel: form.yearLevel,
      acceptedEula,
    }),
    [acceptedEula, form.email, form.name, form.program, form.yearLevel],
  );

  useEffect(() => {
    let active = true;

    loadDraft<RegisterDraft>(REGISTER_DRAFT_KEY)
      .then((saved) => {
        if (!active || !saved) {
          return;
        }

        setForm((current) => ({
          ...current,
          name: saved.name ?? '',
          email: saved.email ?? '',
          program: saved.program ?? '',
          yearLevel: saved.yearLevel ?? '',
        }));
        setAcceptedEula(Boolean(saved.acceptedEula));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void saveDraft(REGISTER_DRAFT_KEY, registerDraft).catch(() => undefined);
  }, [registerDraft]);

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

    if (!acceptedEula) {
      hapticWarning();
      Alert.alert('Agreement Required', 'Please review and accept the EULA before creating an account.');
      return;
    }

    let createdUser: User | null = null;

    try {
      setLoading(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password,
      );
      createdUser = credential.user;

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
        eulaAcceptedAt: serverTimestamp(),
        eulaVersion: EULA_VERSION,
        createdAt: serverTimestamp(),
      });

      await clearDraft(REGISTER_DRAFT_KEY).catch(() => undefined);

      hapticSuccess();
      Alert.alert('Registration Complete', 'Your account has been created.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (error) {
      let message =
        error instanceof Error ? error.message : 'Registration failed.';

      if (
        createdUser &&
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'permission-denied'
      ) {
        await deleteUser(createdUser).catch(() => undefined);
        message = 'Registration is blocked by Firestore rules. Deploy the latest rules, then try again.';
      }

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboard}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="on-drag"
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
            <View style={styles.passwordInputWrap}>
              <TextInput
                onBlur={() => setShowPasswordTip(false)}
                onChangeText={(value) => updateField('password', value)}
                onFocus={() => setShowPasswordTip(true)}
                placeholder="Password"
                placeholderTextColor={APP_COLORS.placeholder}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                value={form.password}
              />
              <TouchableOpacity
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => {
                  hapticLight();
                  setShowPassword((current) => !current);
                }}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={APP_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
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
            activeOpacity={0.82}
            onPress={() => {
              hapticLight();
              setAcceptedEula((current) => !current);
            }}
            style={styles.eulaRow}
          >
            <View style={[styles.checkbox, acceptedEula ? styles.checkboxChecked : null]}>
              {acceptedEula ? (
                <Ionicons name="checkmark" size={15} color={APP_COLORS.surface} />
              ) : null}
            </View>
            <Text style={styles.eulaText}>
              I agree to the{' '}
              <Text
                onPress={() => {
                  hapticLight();
                  router.push('/eula');
                }}
                style={styles.eulaLink}
              >
                FoxFindz EULA
              </Text>
              .
            </Text>
          </TouchableOpacity>

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
  passwordInput: {
    marginBottom: 0,
    paddingRight: 48,
  },
  passwordInputWrap: {
    marginBottom: 12,
    position: 'relative',
  },
  passwordToggle: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 2,
    width: 44,
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
  checkbox: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  eulaLink: {
    color: APP_COLORS.primary,
    fontWeight: '900',
  },
  eulaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    paddingBottom: 4,
    paddingTop: 2,
  },
  eulaText: {
    color: APP_COLORS.textMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  link: {
    textAlign: 'center',
    color: APP_COLORS.primary,
    marginTop: 20,
    fontWeight: '600',
  },
});

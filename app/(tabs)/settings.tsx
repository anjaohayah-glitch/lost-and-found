import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signOut, updateProfile } from '@firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import OfflineBanner from '../../components/OfflineBanner';
import FoxLogo from '../../components/FoxLogo';
import {
  FIREBASE_SETUP_MESSAGE,
  auth,
  db,
  firebaseReady,
} from '../../services/firebase';
import { APP_COLORS } from '../../src/constants/colors';
import { useStore } from '../../store/useStore';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '../../utils/haptics';

const PROGRAMS = [
  'BIT Computer',
  'BIT Electrical',
  'BIT Mechatronics',
  'BIT Drafting',
  'BIT Electronics',
  'BSIT',
];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
};

function SettingsRow({ destructive, icon, label, onPress, value }: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={styles.row}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.rowIcon,
          destructive ? styles.rowIconDanger : styles.rowIconDefault,
        ]}
      >
        <Ionicons
          color={destructive ? APP_COLORS.lost : APP_COLORS.primary}
          name={icon}
          size={18}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowText, destructive && styles.rowTextDanger]}>
          {label}
        </Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      <Ionicons color={APP_COLORS.textLight} name="chevron-forward" size={18} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const isOffline = useStore((state) => state.isOffline);
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);
  const signedIn = Boolean(auth?.currentUser);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    program: '',
    yearLevel: '',
  });

  useEffect(() => {
    setProfileForm({
      name: profile?.name ?? auth?.currentUser?.displayName ?? '',
      program: profile?.program ?? '',
      yearLevel: profile?.yearLevel ?? '',
    });
  }, [profile?.name, profile?.program, profile?.yearLevel]);

  const updateProfileField = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpenProfileEditor = () => {
    if (!signedIn && firebaseReady) {
      Alert.alert('Sign in required', 'Please sign in before editing your profile.');
      return;
    }

    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    hapticMedium();

    const currentUser = auth?.currentUser ?? null;
    const name = profileForm.name.trim();

    if (!name) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }

    try {
      setSavingProfile(true);

      if (firebaseReady && currentUser) {
        await updateProfile(currentUser, { displayName: name });

        if (db) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            name,
            program: profileForm.program,
            yearLevel: profileForm.yearLevel,
            updatedAt: serverTimestamp(),
          });
        }
      }

      setProfile({
        uid: profile?.uid ?? currentUser?.uid ?? 'demo-user',
        name,
        email: profile?.email ?? currentUser?.email ?? '',
        role: profile?.role ?? 'user',
        program: profileForm.program,
        yearLevel: profileForm.yearLevel,
        isOnline: profile?.isOnline,
        fcmToken: profile?.fcmToken,
      });

      setEditingProfile(false);
      hapticSuccess();
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Your profile could not be updated.';
      Alert.alert('Update failed', message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    hapticMedium();

    const email = profile?.email ?? auth?.currentUser?.email ?? '';

    if (!firebaseReady || !auth) {
      Alert.alert('Demo mode', 'Password reset needs Firebase auth to be enabled.');
      return;
    }

    if (!email) {
      Alert.alert('No email found', 'Your account does not have an email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password reset sent', `Check ${email} for the reset link.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Password reset could not be sent.';
      Alert.alert('Reset failed', message);
    }
  };

  const handleLogout = () => {
    hapticWarning();

    if (!signedIn) {
      router.push('/login');
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (auth) {
            await signOut(auth).catch(() => undefined);
          }
          setProfile(null);
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Account Center</Text>
            <Text style={styles.title}>Settings</Text>
          </View>
          <View style={styles.headerLogo}>
            <FoxLogo size={42} />
          </View>
        </View>

        {!firebaseReady ? (
          <OfflineBanner message={FIREBASE_SETUP_MESSAGE} tone="info" />
        ) : null}
        {isOffline ? (
          <OfflineBanner
            message="You are offline. Account changes may not sync immediately."
          />
        ) : null}

        <View style={styles.profileCard}>
          <View style={styles.profileGlow} />
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.name ?? auth?.currentUser?.email ?? 'G').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rolePill}>
              <Ionicons
                color={APP_COLORS.primaryDark}
                name={profile?.role === 'admin' ? 'shield-checkmark-outline' : signedIn ? 'person-outline' : 'person-circle-outline'}
                size={12}
              />
              <Text style={styles.roleText}>
                {profile?.role === 'admin' ? 'Admin' : signedIn ? 'User' : 'Guest'}
              </Text>
            </View>
          </View>
          <View style={styles.profileBody}>
            <Text numberOfLines={1} style={styles.profileName}>
              {profile?.name ?? 'Guest'}
            </Text>
            <Text numberOfLines={1} style={styles.profileEmail}>
              {profile?.email ?? auth?.currentUser?.email ?? 'No active session'}
            </Text>
            <View style={styles.profileMetaRow}>
              <View style={styles.profileMetaPill}>
                <Ionicons color={APP_COLORS.surface} name="school-outline" size={12} />
                <Text style={styles.profileMeta}>{profile?.program ?? 'Campus Member'}</Text>
              </View>
              {profile?.yearLevel ? (
                <View style={styles.profileMetaPill}>
                  <Ionicons color={APP_COLORS.surface} name="ribbon-outline" size={12} />
                  <Text style={styles.profileMeta}>{profile.yearLevel}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="person-outline"
            label="Edit profile"
            onPress={handleOpenProfileEditor}
          />
          <SettingsRow
            icon="key-outline"
            label="Change password"
            value="Send reset email"
            onPress={() => void handleChangePassword()}
          />
        </View>

        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="search-outline"
            label="Report lost item"
            onPress={() => router.push('/lost-form')}
          />
          <SettingsRow
            icon="hand-left-outline"
            label="Report found item"
            onPress={() => router.push('/found-form')}
          />
          {profile?.role === 'admin' ? (
            <SettingsRow
              icon="speedometer-outline"
              label="Open admin dashboard"
              onPress={() => router.push('/admin')}
            />
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.section}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                isOffline ? styles.statusDotOffline : styles.statusDotOnline,
              ]}
            />
            <View style={styles.rowBody}>
              <Text style={styles.rowText}>
                {isOffline ? 'Offline mode' : 'Connected'}
              </Text>
              <Text style={styles.rowValue}>
                {isOffline
                  ? 'Some changes may sync later.'
                  : 'Your app is ready to sync.'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutButton, !signedIn && styles.loginButton]}
          activeOpacity={0.82}
        >
          <Ionicons
            color={signedIn ? APP_COLORS.surface : APP_COLORS.primary}
            name={signedIn ? 'log-out-outline' : 'log-in-outline'}
            size={18}
          />
          <Text style={[styles.logoutText, !signedIn && styles.loginText]}>
            {signedIn ? 'Sign out' : 'Go to login'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setEditingProfile(false)}
        transparent
        visible={editingProfile}
      >
        <Pressable style={styles.modalPressable} onPress={() => setEditingProfile(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit profile</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setEditingProfile(false);
                }}
                style={styles.modalClose}
              >
                <Ionicons color={APP_COLORS.textMuted} name="close" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              onChangeText={(value) => updateProfileField('name', value)}
              placeholder="Full name"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.input}
              value={profileForm.name}
            />

            <Text style={styles.inputLabel}>Program</Text>
            <View style={styles.chipRow}>
              {PROGRAMS.map((program) => {
                const selected = profileForm.program === program;

                return (
                  <TouchableOpacity
                    key={program}
                    onPress={() => {
                      hapticLight();
                      updateProfileField('program', program);
                    }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {program}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Year level</Text>
            <View style={styles.chipRow}>
              {YEAR_LEVELS.map((yearLevel) => {
                const selected = profileForm.yearLevel === yearLevel;

                return (
                  <TouchableOpacity
                    key={yearLevel}
                    onPress={() => {
                      hapticLight();
                      updateProfileField('yearLevel', yearLevel);
                    }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {yearLevel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              disabled={savingProfile}
              onPress={() => void handleSaveProfile()}
              style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
              activeOpacity={0.82}
            >
              {savingProfile ? (
                <ActivityIndicator color={APP_COLORS.surface} />
              ) : (
                <Text style={styles.saveButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primaryDark,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 104,
    overflow: 'hidden',
    padding: 18,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  kicker: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  title: {
    color: APP_COLORS.surface,
    fontSize: 28,
    fontWeight: '900',
  },
  headerLogo: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  profileCard: {
    backgroundColor: APP_COLORS.ink,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 18,
    marginBottom: 18,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 4,
  },
  profileGlow: {
    backgroundColor: 'rgba(240,100,47,0.34)',
    borderRadius: 80,
    height: 120,
    position: 'absolute',
    right: -42,
    top: -42,
    width: 120,
  },
  profileHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: APP_COLORS.primaryDark,
    fontSize: 22,
    fontWeight: '900',
  },
  profileBody: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: APP_COLORS.surface,
    marginBottom: 4,
  },
  rolePill: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleText: {
    color: APP_COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.74)',
    marginBottom: 12,
  },
  profileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileMetaPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileMeta: {
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  section: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  rowIconDefault: {
    backgroundColor: APP_COLORS.surfaceAlt,
  },
  rowIconDanger: {
    backgroundColor: APP_COLORS.lostLight,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowText: {
    color: APP_COLORS.text,
    fontWeight: '800',
  },
  rowTextDanger: {
    color: APP_COLORS.lost,
  },
  rowValue: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusDot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  statusDotOnline: {
    backgroundColor: APP_COLORS.found,
  },
  statusDotOffline: {
    backgroundColor: APP_COLORS.lost,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.lost,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 'auto',
  },
  loginButton: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderWidth: 1,
  },
  logoutText: {
    color: APP_COLORS.surface,
    fontWeight: '800',
  },
  loginText: {
    color: APP_COLORS.primary,
  },
  modalPressable: {
    flex: 1,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(26, 10, 0, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: APP_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: APP_COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalClose: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  inputLabel: {
    color: APP_COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: APP_COLORS.background,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: APP_COLORS.text,
    marginBottom: 14,
    padding: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  chipText: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: APP_COLORS.surface,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 2,
  },
  saveButtonDisabled: {
    opacity: 0.72,
  },
  saveButtonText: {
    color: APP_COLORS.surface,
    fontWeight: '900',
  },
});

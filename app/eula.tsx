import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EULA_SECTIONS, EULA_VERSION } from '../src/constants/eula';
import { APP_COLORS } from '../src/constants/colors';
import { hapticLight } from '../utils/haptics';

export default function EulaScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={18} color={APP_COLORS.surface} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>FoxFindz</Text>
          <Text style={styles.title}>End User License Agreement</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.versionPill}>
          <Ionicons name="document-text-outline" size={16} color={APP_COLORS.primary} />
          <Text style={styles.versionText}>Version {EULA_VERSION}</Text>
        </View>

        {EULA_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.note}>
          This summary is provided for in-app acceptance. For formal institutional
          or legal requirements, have the final language reviewed before release.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primaryDark,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 20,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: APP_COLORS.surface,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  versionPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  versionText: {
    color: APP_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  sectionTitle: {
    color: APP_COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionBody: {
    color: APP_COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  note: {
    color: APP_COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
});

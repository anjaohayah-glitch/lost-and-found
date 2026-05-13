import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import PostForm from '../components/PostForm';
import { APP_COLORS } from '../src/constants/colors';
import type { PostType } from '../src/types/post';

interface ReportComposerProps {
  type: PostType;
}

export function ReportComposer({ type }: ReportComposerProps) {
  const router = useRouter();
  const title = type === 'found' ? 'Report Found Item' : 'Report Lost Item';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
      </View>

      <PostForm type={type} />
    </SafeAreaView>
  );
}

export default function ReportScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type: PostType = params.type === 'found' ? 'found' : 'lost';

  return <ReportComposer type={type} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: APP_COLORS.text,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: APP_COLORS.text,
  },
  spacer: {
    width: 36,
  },
});

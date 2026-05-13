import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { clearDraft, loadDraft, saveDraft } from '../hooks/useOfflineQueue';
import { CATEGORIES } from '../src/constants/categories';
import { APP_COLORS, FOUND_FORM_COLORS, LOST_FORM_COLORS } from '../src/constants/colors';
import { LOCATIONS } from '../src/constants/locations';
import type { PostType } from '../src/types/post';
import { FIREBASE_SETUP_MESSAGE, auth, db, firebaseReady } from '../services/firebase';
import { uploadPostImage } from '../services/imageHosting';
import { useStore } from '../store/useStore';

interface PostDraft {
  title: string;
  description: string;
  category: string;
  location: string;
  imageUri: string | null;
}

interface PostFormProps {
  type: PostType;
}

const DEFAULT_DRAFT: PostDraft = {
  title: '',
  description: '',
  category: '',
  location: '',
  imageUri: null,
};

export default function PostForm({ type }: PostFormProps) {
  const router = useRouter();
  const profile = useStore((state) => state.profile);
  const isFound = type === 'found';
  const colors = isFound ? FOUND_FORM_COLORS : LOST_FORM_COLORS;
  const accentColor = isFound ? APP_COLORS.found : APP_COLORS.lost;
  const draftKey = useMemo(() => `foxfindz_draft_${type}`, [type]);

  const [form, setForm] = useState<PostDraft>(DEFAULT_DRAFT);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraft<PostDraft>(draftKey)
      .then((saved) => { if (active && saved) setForm(saved); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    void saveDraft(draftKey, form).catch(() => undefined);
  }, [draftKey, form]);

  const updateField = (field: keyof PostDraft, value: string | null) =>
    setForm((cur) => ({ ...cur, [field]: value }));

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Needed', 'Please allow photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      updateField('imageUri', result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      updateField('imageUri', result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose how to add a photo', [
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose from Library', onPress: () => void pickImage() },
      form.imageUri ? { text: 'Remove Photo', style: 'destructive', onPress: () => updateField('imageUri', null) } : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean) as any);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the item title and description.');
      return;
    }
    if (!form.category || !form.location) {
      Alert.alert('Missing Fields', 'Please choose a category and location.');
      return;
    }
    if (isFound && !form.imageUri) {
      Alert.alert('Photo Required', 'Found items must include a photo for verification.');
      return;
    }
    if (!firebaseReady || !auth || !db) {
      Alert.alert('Setup Required', FIREBASE_SETUP_MESSAGE);
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in before submitting.');
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      let imageUrl: string | null = null;

      if (form.imageUri) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadPostImage({
            uri: form.imageUri,
            postType: type,
            userId: user.uid,
          });
        } catch (error) {
          Alert.alert(
            'Photo Upload Failed',
            error instanceof Error
              ? error.message
              : 'Please choose a smaller photo or try again.',
          );
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      await addDoc(collection(db, 'posts'), {
        type,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        location: form.location,
        imageUrl,
        userId: user.uid,
        userName: profile?.name ?? user.displayName ?? user.email ?? 'Campus Member',
        userEmail: profile?.email ?? user.email ?? null,
        status: 'pending',
        createdAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null,
      });

      await clearDraft(draftKey);
      setForm(DEFAULT_DRAFT);
      Alert.alert('Submitted! 🦊', 'Your post is waiting for admin approval. You\'ll be notified once it\'s live.');
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Submission Failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const isComplete = form.title.trim() && form.description.trim() && form.category && form.location && (!isFound || form.imageUri);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Image upload area */}
      <TouchableOpacity
        onPress={showImageOptions}
        style={[
          styles.imageArea,
          { borderColor: form.imageUri ? accentColor : colors.border },
          form.imageUri ? styles.imageAreaFilled : null,
        ]}
        activeOpacity={0.8}
      >
        {form.imageUri ? (
          <>
            <Image source={{ uri: form.imageUri }} style={styles.imagePreview} />
            <View style={styles.imageOverlay}>
              <View style={styles.imageOverlayBtn}>
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={styles.imageOverlayText}>Change photo</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <View style={[styles.imageIconCircle, { backgroundColor: accentColor + '18' }]}>
              <Ionicons name="camera-outline" size={32} color={accentColor} />
            </View>
            <Text style={[styles.imageUploadTitle, { color: accentColor }]}>
              {isFound ? 'Add Photo (Required)' : 'Add Photo (Optional)'}
            </Text>
            <Text style={styles.imageUploadSub}>
              {isFound
                ? 'A clear photo helps verify the item'
                : 'A photo improves match accuracy'}
            </Text>
            <View style={styles.imageSourceRow}>
              <View style={styles.imageSourcePill}>
                <Ionicons name="camera-outline" size={12} color={APP_COLORS.textMuted} />
                <Text style={styles.imageSourceText}>Camera</Text>
              </View>
              <View style={styles.imageSourcePill}>
                <Ionicons name="images-outline" size={12} color={APP_COLORS.textMuted} />
                <Text style={styles.imageSourceText}>Gallery</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.label, { color: colors.text }]}>Item Title</Text>
      <TextInput
        onChangeText={(v) => updateField('title', v)}
        placeholder="e.g. Black Samsung phone with cracked case"
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={form.title}
      />

      {/* Description */}
      <Text style={[styles.label, { color: colors.text }]}>Description</Text>
      <TextInput
        multiline
        numberOfLines={5}
        onChangeText={(v) => updateField('description', v)}
        placeholder="Describe the item in detail — color, brand, distinguishing features, where exactly..."
        placeholderTextColor={colors.placeholder}
        style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text }]}
        textAlignVertical="top"
        value={form.description}
      />

      {/* Category */}
      <Text style={[styles.label, { color: colors.text }]}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => {
          const selected = form.category === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => updateField('category', cat.value)}
              style={[
                styles.chip,
                { backgroundColor: selected ? accentColor : colors.surface, borderColor: selected ? accentColor : colors.border },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? '#fff' : colors.textMuted }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Location */}
      <Text style={[styles.label, { color: colors.text }]}>Location</Text>
      <View style={styles.chipRow}>
        {LOCATIONS.map((loc) => {
          const selected = form.location === loc;
          return (
            <TouchableOpacity
              key={loc}
              onPress={() => updateField('location', loc)}
              style={[
                styles.chip,
                { backgroundColor: selected ? accentColor : colors.surface, borderColor: selected ? accentColor : colors.border },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? '#fff' : colors.textMuted }]}>
                {loc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Draft notice */}
      <View style={styles.draftNotice}>
        <Ionicons name="save-outline" size={13} color={APP_COLORS.textLight} />
        <Text style={styles.draftText}>Draft saves automatically on this device</Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        disabled={loading || !isComplete}
        onPress={() => void handleSubmit()}
        style={[
          styles.submitButton,
          { backgroundColor: isComplete ? accentColor : APP_COLORS.border },
          loading ? styles.submitButtonDisabled : null,
        ]}
        activeOpacity={0.85}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.submitText}>
              {uploadingImage ? 'Uploading photo...' : 'Submitting...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.submitText}>
            {isComplete ? 'Submit for Approval' : 'Fill all required fields'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  imageArea: {
    borderWidth: 1.5,
    borderRadius: 18,
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 200,
  },
  imageAreaFilled: {
    borderStyle: 'solid',
  },
  imagePreview: {
    width: '100%',
    height: 220,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  imageOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  imageOverlayText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  imageIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  imageUploadTitle: { fontSize: 15, fontWeight: '800' },
  imageUploadSub: { color: APP_COLORS.textMuted, fontSize: 12 },
  imageSourceRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  imageSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  imageSourceText: { color: APP_COLORS.textMuted, fontSize: 11, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    fontSize: 15,
  },
  textArea: { minHeight: 120 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },

  draftNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
    justifyContent: 'center',
  },
  draftText: { color: APP_COLORS.textLight, fontSize: 12 },

  submitButton: {
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 16,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

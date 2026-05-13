import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { CATEGORIES } from '../constants/categories';
import {
  FOUND_FORM_COLORS,
  LOST_FORM_COLORS,
  SHARED_STATUS_COLORS,
} from '../constants/colors';
import { LOCATIONS } from '../constants/locations';
import { auth, db, firebaseReady, storage } from '../config/firebase';
import { RootStackNavigationProp } from '../navigation/types';
import { PostType } from '../types/post';

interface PostComposerScreenProps {
  type: PostType;
  navigation: RootStackNavigationProp;
}

type FormColors = typeof LOST_FORM_COLORS | typeof FOUND_FORM_COLORS;

const SCREEN_COPY = {
  lost: {
    badge: 'LOST',
    headerTitle: 'Report Lost Item',
    headerSubtitle: 'Help the community find it',
    photoHint: 'Adding a photo greatly increases the chance of recovery',
    titlePlaceholder: 'e.g. Black Samsung A54 phone',
    locationLabel: 'Last Seen Location',
    locationPlaceholder: 'Where did you last have it?',
    descriptionHint: 'Color, brand, distinguishing features, when it was lost',
    descriptionPlaceholder:
      'Describe the item in detail. Include color, brand, unique marks, and when or where you lost it...',
    successTitle: 'Posted!',
    successMessage:
      'Your lost item report has been submitted and is pending admin approval.',
    submitLabel: 'Submit Lost Item Report',
    submitIcon: '',
    requiredTitle: 'Please enter a title for your lost item.',
    requiredDescription: 'Please describe the lost item.',
    requiredLocation: 'Please select where you last saw the item.',
    uploadAccent: 'lost' as const,
  },
  found: {
    badge: 'FOUND',
    headerTitle: 'Report Found Item',
    headerSubtitle: 'Help reunite it with the owner',
    photoHint: 'A photo helps the owner identify their item quickly',
    titlePlaceholder: 'e.g. Blue water bottle with stickers',
    locationLabel: 'Found Location',
    locationPlaceholder: 'Where did you find it?',
    descriptionHint: 'Color, brand, condition, and identifying details',
    descriptionPlaceholder:
      'Describe the item in detail. Include color, brand, condition, and any unique features that would help the owner identify it...',
    successTitle: 'Thank you!',
    successMessage:
      "Your found item report has been submitted. An admin can review it before it appears in the community feed.",
    submitLabel: 'Submit Found Item Report',
    submitIcon: '',
    requiredTitle: 'Please enter a title for the found item.',
    requiredDescription: 'Please describe the found item.',
    requiredLocation: 'Please select where you found the item.',
    uploadAccent: 'found' as const,
  },
} as const;

function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const value = (error as { code?: unknown }).code;
    return typeof value === 'string' ? value : null;
  }

  return null;
}

function getStyles(colors: FormColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backArrow: {
      fontSize: 22,
      color: colors.text,
    },
    headerText: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    headerSub: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    introBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.foundLight,
      borderWidth: 1,
      borderColor: colors.foundBorder,
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
      gap: 12,
    },
    introEmoji: {
      fontSize: 28,
    },
    introTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.found,
      marginBottom: 2,
    },
    introText: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    section: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    labelHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    required: {
      color: colors.borderFocus,
    },
    optionalBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    optionalText: {
      fontSize: 10,
      color: colors.borderFocus,
      fontWeight: '600',
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    inputFocused: {
      borderColor: colors.borderFocus,
      backgroundColor: colors.surface,
      shadowColor: colors.borderFocus,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    textArea: {
      height: 120,
      paddingTop: 12,
    },
    charCount: {
      fontSize: 11,
      color: colors.textLight,
      textAlign: 'right',
      marginTop: 4,
    },
    pickerBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerBtnText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
      paddingRight: 10,
    },
    pickerArrow: {
      fontSize: 10,
      color: colors.textMuted,
    },
    pickerDropdown: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginTop: 4,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    pickerItem: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    pickerItemActive: {
      backgroundColor: colors.surfaceAlt,
    },
    pickerItemText: {
      fontSize: 14,
      color: colors.text,
    },
    pickerItemTextActive: {
      color: colors.borderFocus,
      fontWeight: '600',
    },
    imageUploadBtn: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    uploadText: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    uploadHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    imagePreviewContainer: {
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: 200,
      borderRadius: 16,
    },
    removeImageBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeImageText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    changeImageBtn: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    changeImageText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    offlineNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: SHARED_STATUS_COLORS.infoBackground,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      gap: 8,
    },
    offlineIcon: {
      fontSize: 16,
    },
    offlineText: {
      flex: 1,
      fontSize: 12,
      color: SHARED_STATUS_COLORS.infoText,
      lineHeight: 18,
    },
    adminNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: SHARED_STATUS_COLORS.warningBackground,
      borderRadius: 10,
      padding: 12,
      marginBottom: 20,
      gap: 8,
    },
    adminIcon: {
      fontSize: 16,
    },
    adminText: {
      flex: 1,
      fontSize: 12,
      color: SHARED_STATUS_COLORS.warningText,
      lineHeight: 18,
    },
    submitBtn: {
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnIcon: {
      fontSize: 16,
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
  });
}

export default function PostComposerScreen({ type, navigation }: PostComposerScreenProps) {
  const isLost = type === 'lost';
  const colors = isLost ? LOST_FORM_COLORS : FOUND_FORM_COLORS;
  const copy = SCREEN_COPY[type];
  const styles = getStyles(colors);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const imageScale = useRef(new Animated.Value(0)).current;
  const submitAnim = useRef(new Animated.Value(1)).current;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      Animated.spring(imageScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      Animated.spring(imageScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Camera', onPress: () => void takePhoto() },
      { text: 'Photo Library', onPress: () => void pickImage() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadImage = async (uri: string): Promise<string> => {
    if (!storage) {
      throw new Error('storage-unavailable');
    }

    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `posts/${auth?.currentUser?.uid ?? 'guest'}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);

    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', copy.requiredTitle);
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required', copy.requiredDescription);
      return;
    }

    if (!category) {
      Alert.alert('Required', 'Please select a category.');
      return;
    }

    if (!location) {
      Alert.alert('Required', copy.requiredLocation);
      return;
    }

    if (!firebaseReady || !db || !storage) {
      Alert.alert(
        'Firebase setup needed',
        'Add your Firebase credentials in app.json under expo.extra.firebase before submitting live posts.'
      );
      return;
    }

    const currentUser = auth?.currentUser;

    if (!currentUser) {
      Alert.alert(
        'Sign in required',
        'Please sign in before submitting a live post.'
      );
      return;
    }

    setSubmitting(true);
    Animated.timing(submitAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();

    try {
      let imageUrl: string | null = null;

      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      await addDoc(collection(db, 'posts'), {
        type,
        title: title.trim(),
        description: description.trim(),
        category,
        location,
        imageUrl,
        status: 'pending',
        userId: currentUser.uid,
        userName: currentUser.displayName ?? 'Campus Member',
        userEmail: currentUser.email ?? null,
        createdAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null,
      });

      Alert.alert(copy.successTitle, copy.successMessage, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const errorCode = getErrorCode(error);

      if (errorCode === 'permission-denied') {
        Alert.alert(
          'Permission denied',
          'Firestore rejected the write. Sign in a user or adjust your Firebase rules for testing.'
        );
      } else if (errorCode === 'unavailable') {
        Alert.alert(
          'Connection issue',
          'The post could not be submitted right now. Reconnect to the internet and try again.'
        );
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
      Animated.timing(submitAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const selectedCategory = CATEGORIES.find((item) => item.value === category);
  const uploadBackground = isLost ? colors.lostLight : colors.foundLight;
  const uploadBorder = isLost ? colors.lostBorder : colors.foundBorder;
  const uploadTextColor = isLost ? colors.lost : colors.found;
  const badgeStyle = isLost
    ? { backgroundColor: colors.lostLight, borderColor: colors.lostBorder, color: colors.lost }
    : { backgroundColor: colors.foundLight, borderColor: colors.foundBorder, color: colors.found };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{copy.headerTitle}</Text>
            <Text style={styles.headerSub}>{copy.headerSubtitle}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor, borderColor: badgeStyle.borderColor }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{copy.badge}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isLost ? (
            <View style={styles.introBanner}>
              <Text style={styles.introEmoji}></Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>You're doing a good deed</Text>
                <Text style={styles.introText}>
                  Returning lost items helps build a more trustworthy campus community.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Photo</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>Recommended</Text>
              </View>
            </View>
            <Text style={styles.labelHint}>{copy.photoHint}</Text>

            {imageUri ? (
              <Animated.View style={{ transform: [{ scale: imageScale }] }}>
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => {
                      setImageUri(null);
                      imageScale.setValue(0);
                    }}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.changeImageBtn} onPress={showImageOptions}>
                    <Text style={styles.changeImageText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.imageUploadBtn,
                  { backgroundColor: uploadBackground, borderColor: uploadBorder },
                ]}
                onPress={showImageOptions}
                activeOpacity={0.75}
              >
                <Text style={styles.uploadIcon}></Text>
                <Text style={[styles.uploadText, { color: uploadTextColor }]}>Tap to add a photo</Text>
                <Text style={styles.uploadHint}>Camera or Gallery</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Item Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, focusedField === 'title' && styles.inputFocused]}
              placeholder={copy.titlePlaceholder}
              placeholderTextColor={colors.placeholder}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
              maxLength={80}
            />
            <Text style={styles.charCount}>{title.length}/80</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.pickerBtn, showCategoryPicker && styles.inputFocused]}
              onPress={() => {
                setShowCategoryPicker((current) => {
                  const next = !current;
                  if (next) {
                    setShowLocationPicker(false);
                  }
                  return next;
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.pickerBtnText, !category && { color: colors.placeholder }]}>
                {selectedCategory ? selectedCategory.label : 'Select a category'}
              </Text>
              <Text style={styles.pickerArrow}>{showCategoryPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCategoryPicker ? (
              <View style={styles.pickerDropdown}>
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.pickerItem,
                      category === item.value && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setCategory(item.value);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        category === item.value && styles.pickerItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              {copy.locationLabel} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.pickerBtn, showLocationPicker && styles.inputFocused]}
              onPress={() => {
                setShowLocationPicker((current) => {
                  const next = !current;
                  if (next) {
                    setShowCategoryPicker(false);
                  }
                  return next;
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.pickerBtnText, !location && { color: colors.placeholder }]}>
                {location || copy.locationPlaceholder}
              </Text>
              <Text style={styles.pickerArrow}>{showLocationPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showLocationPicker ? (
              <View style={styles.pickerDropdown}>
                {LOCATIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pickerItem, location === item && styles.pickerItemActive]}
                    onPress={() => {
                      setLocation(item);
                      setShowLocationPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        location === item && styles.pickerItemTextActive,
                      ]}
                    >
                       {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.labelHint}>{copy.descriptionHint}</Text>
            <TextInput
              style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused]}
              placeholder={copy.descriptionPlaceholder}
              placeholderTextColor={colors.placeholder}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          <View style={styles.offlineNotice}>
            <Text style={styles.offlineIcon}></Text>
            <Text style={styles.offlineText}>
              Keep an internet connection on while submitting, especially when uploading photos.
            </Text>
          </View>

          <View style={styles.adminNotice}>
            <Text style={styles.adminIcon}></Text>
            <Text style={styles.adminText}>
              New posts are saved with a pending status first so an admin can review them before
              they appear publicly.
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: submitAnim }] }}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isLost ? colors.lost : colors.found,
                  shadowColor: isLost ? colors.lost : colors.found,
                },
                submitting && styles.submitBtnDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnIcon}>{copy.submitIcon}</Text>
                  <Text style={styles.submitBtnText}>{copy.submitLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


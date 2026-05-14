import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import { auth, db, firebaseReady, storage } from '../../services/firebase';
import { APP_COLORS } from '../../src/constants/colors';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '../../utils/haptics';

interface Message {
  id: string;
  senderId: string;
  text?: string | null;
  imageUrl?: string | null;
  createdAt: any;
  seen?: boolean;
}

interface ConversationMeta {
  participantIds: string[];
  participantNames?: Record<string, string>;
  postId?: string | null;
  postTitle?: string | null;
  postType?: 'lost' | 'found' | null;
  postLocation?: string | null;
  postStatus?: string | null;
}

const AVATAR_COLORS = [
  { bg: '#FEF2F2', text: APP_COLORS.primary },
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#F0FFF4', text: '#16A34A' },
  { bg: '#F5F3FF', text: '#7C3AED' },
  { bg: '#FFFBEB', text: '#B45309' },
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp?.toDate?.() ?? new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp?.toDate?.() ?? new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    senderId: 'other',
    text: 'Hi! I think I found your phone near the library. Can you describe the wallpaper?',
    createdAt: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: '2',
    senderId: 'demo-user',
    text: "Oh really?! It's a photo of a sunset at the beach with my dog.",
    createdAt: new Date(Date.now() - 1000 * 60 * 18),
  },
  {
    id: '3',
    senderId: 'other',
    text: 'Yes that matches! I have it with me. When can we meet?',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '4',
    senderId: 'demo-user',
    text: "I'm free after 2PM today. Can we meet at the canteen?",
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: '5',
    senderId: 'other',
    text: 'Can you confirm the wallpaper before we meet near the library?',
    createdAt: new Date(Date.now() - 1000 * 60 * 8),
    seen: true,
  },
];

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUser = auth?.currentUser ?? null;
  const uid = currentUser?.uid ?? 'demo-user';

  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [conversationMissing, setConversationMissing] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!firebaseReady || !db || !conversationId || !currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'conversations', conversationId),
      (snap) => {
        setConversationMissing(!snap.exists());
        if (snap.exists()) setMeta(snap.data() as ConversationMeta);
      },
      (error) => {
        console.error('conversation listener error:', error);
        setConversationMissing(true);
      },
    );
    return unsub;
  }, [conversationId, currentUser]);

  useEffect(() => {
    if (!firebaseReady || !db || !conversationId || !currentUser) {
      setMessages(DEMO_MESSAGES);
      return;
    }
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })),
        );
        if (db && conversationId) {
          updateDoc(doc(db, 'conversations', conversationId), {
            unreadBy: [],
          }).catch(() => undefined);
        }
      },
      () => setMessages(DEMO_MESSAGES),
    );
    return unsub;
  }, [conversationId, currentUser]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    hapticMedium();

    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (firebaseReady && conversationMissing) {
      Alert.alert(
        'Conversation Unavailable',
        'Open a real conversation from a post using Contact Poster, or deploy the latest Firestore rules.',
      );
      return;
    }

    setText('');
    setSending(true);

    if (!firebaseReady || !db || !conversationId || !currentUser) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          senderId: uid,
          text: trimmed,
          createdAt: new Date(),
        },
      ]);
      hapticSuccess();
      setSending(false);
      return;
    }

    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: uid,
        text: trimmed,
        createdAt: serverTimestamp(),
        seen: false,
      });

      updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: trimmed,
        lastMessageAt: serverTimestamp(),
        unreadBy: (meta?.participantIds ?? [uid]).filter((id) => id !== uid),
      }).catch((error) => {
        console.warn('conversation preview update failed:', error);
      });
      hapticSuccess();
    } catch (error) {
      hapticWarning();
      setText(trimmed);
      console.error('send message error:', error);
      Alert.alert(
        'Message Not Sent',
        error instanceof Error
          ? error.message
          : 'Please check your connection and try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleImagePick = async () => {
    hapticLight();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    if (!firebaseReady || !storage || !db || !conversationId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          senderId: uid,
          imageUrl: asset.uri,
          createdAt: new Date(),
        },
      ]);
      hapticSuccess();
      return;
    }

    const activeDb = db;
    const activeStorage = storage;

    setUploading(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storageRef = ref(activeStorage, `chat-images/${conversationId}/${Date.now()}.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          setUploading(false);
          console.error('image upload task error:', error);
          Alert.alert('Image Not Sent', error.message);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(activeDb, 'conversations', conversationId, 'messages'), {
            senderId: uid,
            imageUrl: url,
            createdAt: serverTimestamp(),
            seen: false,
          });
          updateDoc(doc(activeDb, 'conversations', conversationId), {
            lastMessage: 'Image',
            lastMessageAt: serverTimestamp(),
            unreadBy: (meta?.participantIds ?? [uid]).filter((id) => id !== uid),
          }).catch((error) => {
            console.warn('conversation image preview update failed:', error);
          });
          hapticSuccess();
          setUploading(false);
        },
      );
    } catch (error) {
      hapticWarning();
      setUploading(false);
      console.error('send image message error:', error);
      Alert.alert(
        'Image Not Sent',
        error instanceof Error ? error.message : 'Could not send this image.',
      );
    }
  };

  const otherName = (() => {
    if (!meta?.participantNames) return 'Campus member';
    const otherId = meta.participantIds?.find((id) => id !== uid);
    if (otherId && meta.participantNames[otherId]) return meta.participantNames[otherId];
    return Object.entries(meta.participantNames)
      .filter(([id]) => id !== uid)
      .map(([, name]) => name)[0] ?? 'Campus member';
  })();

  const avatarColor = getAvatarColor(otherName);
  const initials = getInitials(otherName);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === uid;
    const prevItem = messages[index - 1];
    const showDate =
      index === 0 ||
      formatDateSeparator(item.createdAt) !== formatDateSeparator(prevItem?.createdAt);
    const isLastFromOther =
      !isMe &&
      (index === messages.length - 1 || messages[index + 1]?.senderId === uid);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>{formatDateSeparator(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
          {!isMe && (
            <View style={[
              styles.msgAvatar,
              { backgroundColor: avatarColor.bg },
              !isLastFromOther && { opacity: 0 },
            ]}>
              <Text style={[styles.msgAvatarText, { color: avatarColor.text }]}>
                {initials.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.bubbleWrap}>
            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.bubbleImage, isMe && styles.bubbleImageMe]}
                resizeMode="cover"
              />
            )}
            {item.text && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                  {item.text}
                </Text>
              </View>
            )}
            <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
              {formatTime(item.createdAt)}
              {isMe && item.seen && '  ✓ Seen'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.headerAvatarText, { color: avatarColor.text }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
          {meta?.postTitle && (
            <Text style={styles.headerPost} numberOfLines={1}>
              re: {meta.postTitle}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      {meta?.postTitle && (
        <TouchableOpacity
          style={styles.postBanner}
          onPress={() => {
            hapticLight();
            if (meta.postId) {
              router.push(`/post-detail?id=${meta.postId}`);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={[
            styles.postBannerIcon,
            { backgroundColor: meta.postType === 'lost' ? APP_COLORS.lostLight : APP_COLORS.foundLight },
          ]}>
            <Ionicons
              name={meta.postType === 'lost' ? 'search' : 'hand-left'}
              size={16}
              color={meta.postType === 'lost' ? APP_COLORS.lost : APP_COLORS.found}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postBannerTitle} numberOfLines={1}>{meta.postTitle}</Text>
            <Text style={styles.postBannerSub}>
              {meta.postType?.toUpperCase() ?? 'ITEM'}
              {meta.postLocation ? ` · ${meta.postLocation}` : ''}
              {meta.postStatus === 'resolved' ? ' · RESOLVED' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={APP_COLORS.textLight} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={APP_COLORS.primary} />
            <Text style={styles.uploadingText}>Uploading image...</Text>
          </View>
        )}

        {conversationMissing && firebaseReady ? (
          <View style={styles.warningBar}>
            <Ionicons name="alert-circle-outline" size={15} color="#92400E" />
            <Text style={styles.warningText}>
              Conversation is unavailable. Open it from Contact Poster or update Firestore rules.
            </Text>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <TouchableOpacity onPress={handleImagePick} style={styles.imageBtn}>
            <Ionicons name="image-outline" size={22} color={APP_COLORS.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={APP_COLORS.textLight}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              (!text.trim() || sending || (conversationMissing && firebaseReady)) &&
                styles.sendBtnDisabled,
            ]}
            disabled={!text.trim() || sending || (conversationMissing && firebaseReady)}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F8' },
  header: {
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  headerAvatarText: { fontSize: 13, fontWeight: '800' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  headerPost: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  headerBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  postBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  postBannerIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  postBannerTitle: { fontSize: 12, fontWeight: '800', color: APP_COLORS.text },
  postBannerSub: { fontSize: 11, color: APP_COLORS.primary, fontWeight: '600' },
  messagesList: { paddingHorizontal: 12, paddingVertical: 14, gap: 4 },
  dateSep: { alignItems: 'center', marginVertical: 10 },
  dateSepText: {
    fontSize: 11, color: APP_COLORS.textLight,
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, fontWeight: '600', overflow: 'hidden',
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  msgAvatarText: { fontSize: 10, fontWeight: '800' },
  bubbleWrap: { maxWidth: '75%' },
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, marginBottom: 2 },
  bubbleMe: { backgroundColor: APP_COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: '#fff', borderWidth: 1,
    borderColor: APP_COLORS.border, borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: APP_COLORS.text, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleImage: { width: 200, height: 150, borderRadius: 14, marginBottom: 2 },
  bubbleImageMe: { borderBottomRightRadius: 4 },
  msgTime: { fontSize: 10, color: APP_COLORS.textLight, marginLeft: 4 },
  msgTimeMe: { textAlign: 'right', marginRight: 4 },
  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#FDE68A',
  },
  uploadingText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: '#fff', borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  imageBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7F7F8', borderRadius: 19,
    borderWidth: 1, borderColor: APP_COLORS.border,
  },
  textInput: {
    flex: 1, backgroundColor: '#F7F7F8', borderRadius: 22,
    borderWidth: 1, borderColor: APP_COLORS.border,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, color: APP_COLORS.text, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});


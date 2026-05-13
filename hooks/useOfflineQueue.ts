import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveDraft<T extends object>(key: string, data: T) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearDraft(key: string) {
  await AsyncStorage.removeItem(key);
}

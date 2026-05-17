import { create } from 'zustand';
import type { PostType } from '../src/types/post';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  program?: string;
  yearLevel?: string;
  role: 'user' | 'admin';
  isOnline?: boolean;
  fcmToken?: string | null;
  eulaAcceptedAt?: unknown;
  eulaVersion?: string;
}

interface AppState {
  filter: PostType;
  drawerOpen: boolean;
  isOffline: boolean;
  unreadCount: number;
  profile: UserProfile | null;
  setFilter: (filter: PostType) => void;
  setDrawerOpen: (open: boolean) => void;
  setIsOffline: (offline: boolean) => void;
  setUnreadCount: (count: number) => void;
  setProfile: (profile: UserProfile | null) => void;
}

export const useStore = create<AppState>((set) => ({
  filter: 'lost',
  drawerOpen: false,
  isOffline: false,
  unreadCount: 0,
  profile: null,
  setFilter: (filter) => set({ filter }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setIsOffline: (isOffline) => set({ isOffline }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setProfile: (profile) => set({ profile }),
}));

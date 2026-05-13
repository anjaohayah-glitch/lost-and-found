import { NavigationProp } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Post } from '../types/post';

export type RootStackParamList = {
  Home: undefined;
  LostPost: undefined;
  FoundPost: undefined;
  PostDetail: { post: Post };
};

export type RootStackNavigationProp = NavigationProp<RootStackParamList>;
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

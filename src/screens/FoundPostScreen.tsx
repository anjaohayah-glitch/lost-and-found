import React from 'react';

import PostComposerScreen from '../components/PostComposerScreen';
import { RootStackScreenProps } from '../navigation/types';

export default function FoundPostScreen({ navigation }: RootStackScreenProps<'FoundPost'>) {
  return <PostComposerScreen type="found" navigation={navigation} />;
}

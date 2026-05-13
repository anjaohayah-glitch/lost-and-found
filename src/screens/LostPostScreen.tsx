import React from 'react';

import PostComposerScreen from '../components/PostComposerScreen';
import { RootStackScreenProps } from '../navigation/types';

export default function LostPostScreen({ navigation }: RootStackScreenProps<'LostPost'>) {
  return <PostComposerScreen type="lost" navigation={navigation} />;
}

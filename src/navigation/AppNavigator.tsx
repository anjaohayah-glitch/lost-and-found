import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { APP_COLORS } from '../constants/colors';
import FoundPostScreen from '../screens/FoundPostScreen';
import HomeScreen from '../screens/HomeScreen';
import LostPostScreen from '../screens/LostPostScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: APP_COLORS.background,
    border: APP_COLORS.border,
    card: APP_COLORS.background,
    primary: APP_COLORS.primary,
    text: APP_COLORS.text,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          animation: 'slide_from_right',
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="LostPost" component={LostPostScreen} />
        <Stack.Screen name="FoundPost" component={FoundPostScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

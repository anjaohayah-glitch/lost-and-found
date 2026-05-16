import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { APP_COLORS } from '../../src/constants/colors';
import { useStore } from '../../store/useStore';
import { hapticLight } from '../../utils/haptics';

function HapticTabButton({ onPress, ref: _ref, ...props }: any) {
  return (
    <Pressable
      {...props}
      onPress={(event) => {
        hapticLight();
        onPress?.(event);
      }}
    />
  );
}

export default function TabLayout() {
  const unreadCount = useStore((state) => state.unreadCount);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: APP_COLORS.primary,
        tabBarInactiveTintColor: APP_COLORS.textLight,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarButton: HapticTabButton,
        tabBarStyle: {
          backgroundColor: APP_COLORS.surface,
          borderTopColor: APP_COLORS.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: APP_COLORS.shadow,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? 'home' : 'home-outline'}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifs',
          tabBarIcon: ({ color, focused, size }) => (
            <View>
              <Ionicons
                color={color}
                name={focused ? 'notifications' : 'notifications-outline'}
                size={size}
              />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused, size }) => (
            <View style={[styles.rewardsIcon, focused && styles.rewardsIconActive]}>
              <Ionicons
                color={focused ? APP_COLORS.surface : color}
                name={focused ? 'gift' : 'gift-outline'}
                size={focused ? size - 1 : size}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color}
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    minHeight: 52,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: APP_COLORS.lost,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: APP_COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  rewardsIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rewardsIconActive: {
    backgroundColor: APP_COLORS.primary,
    shadowColor: APP_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});

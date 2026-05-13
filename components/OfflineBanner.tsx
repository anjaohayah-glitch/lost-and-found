import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface OfflineBannerProps {
  message: string;
  tone?: 'info' | 'warning';
}

export default function OfflineBanner({ message, tone = 'warning' }: OfflineBannerProps) {
  const palette =
    tone === 'info'
      ? {
          backgroundColor: '#EFF6FF',
          borderColor: '#93C5FD',
          textColor: '#1D4ED8',
        }
      : {
          backgroundColor: '#FFF7ED',
          borderColor: '#FDBA74',
          textColor: '#C2410C',
        };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});

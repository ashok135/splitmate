import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface MemberAvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
}

const AVATAR_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
  '#6366F1',
];

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  name,
  photoURL,
  size = 40,
}) => {
  const getInitials = (text: string): string => {
    if (!text) return '?';
    const parts = text.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const getColor = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  const borderRadius = size / 2;
  const fontSize = Math.floor(size * 0.4);

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: getColor(name || 'User'),
        },
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base, styles[size]];

    switch (variant) {
      case 'secondary':
        list.push(styles.secondary);
        break;
      case 'outline':
        list.push(styles.outline);
        break;
      case 'danger':
        list.push(styles.danger);
        break;
      case 'success':
        list.push(styles.success);
        break;
      default:
        list.push(styles.primary);
        break;
    }

    if (disabled || loading) {
      list.push(styles.disabled);
    }

    if (style) list.push(style);
    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.baseText, styles[`${size}Text`]];

    switch (variant) {
      case 'outline':
        list.push(styles.outlineText);
        break;
      case 'secondary':
        list.push(styles.secondaryText);
        break;
      default:
        list.push(styles.primaryText);
        break;
    }

    if (textStyle) list.push(textStyle);
    return list;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={getContainerStyle()}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? '#1E293B' : '#FFFFFF'}
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: '#0F172A',
  },
  secondary: {
    backgroundColor: '#F1F5F9',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  success: {
    backgroundColor: '#10B981',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '600',
  },
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 17,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#334155',
  },
  outlineText: {
    color: '#1E293B',
  },
});

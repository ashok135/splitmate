import React from 'react';
import IconFeather from 'react-native-vector-icons/Feather';
import { COLORS } from '../constants/theme';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = COLORS.text,
}) => {
  return <IconFeather name={name} size={size} color={color} />;
};

export default Icon;

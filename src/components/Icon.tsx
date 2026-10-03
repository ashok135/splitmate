import React from 'react';
import IconFeather from 'react-native-vector-icons/Feather';
import { COLORS } from '../constants/theme';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = COLORS.text,
  style,
}) => {
  return <IconFeather name={name} size={size} color={color} style={style} />;
};

export default Icon;

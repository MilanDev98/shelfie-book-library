import { Text, type TextProps, type TextStyle } from 'react-native';

import { ShelfieColors, ShelfieTypography } from '@/constants/theme';

export type ShelfieTextVariant = keyof typeof ShelfieTypography;

type ShelfieTextProps = TextProps & {
  variant?: ShelfieTextVariant;
  color?: keyof typeof ShelfieColors;
};

export function ShelfieText({
  color,
  style,
  variant = 'body',
  ...props
}: ShelfieTextProps) {
  const variantStyle = ShelfieTypography[variant];
  const colorStyle: TextStyle | undefined = color
    ? { color: ShelfieColors[color] }
    : undefined;

  return <Text {...props} style={[variantStyle, colorStyle, style]} />;
}

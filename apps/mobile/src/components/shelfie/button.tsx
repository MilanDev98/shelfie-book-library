import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import {
  ShelfieColors,
  ShelfieRadius,
  ShelfieShadows,
  ShelfieSpacing,
  ShelfieTypography,
} from '@/constants/theme';

import { ShelfieText } from './text';

const variants = {
  primary: {
    backgroundColor: ShelfieColors.primary,
    borderColor: ShelfieColors.primary,
    foregroundColor: ShelfieColors.onPrimary,
  },
  secondary: {
    backgroundColor: ShelfieColors.surface,
    borderColor: ShelfieColors.border,
    foregroundColor: ShelfieColors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    foregroundColor: ShelfieColors.primary,
  },
  destructive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    foregroundColor: ShelfieColors.noMatch,
  },
} as const;

const sizes = {
  sm: { minHeight: 44, paddingHorizontal: ShelfieSpacing.md },
  md: { minHeight: 52, paddingHorizontal: ShelfieSpacing.lg },
  lg: { minHeight: 56, paddingHorizontal: ShelfieSpacing.xl },
} as const;

export type ShelfieButtonVariant = keyof typeof variants;
export type ShelfieButtonSize = keyof typeof sizes;

export type ShelfieButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  variant?: ShelfieButtonVariant;
  size?: ShelfieButtonSize;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ShelfieButton({
  children,
  disabled = false,
  loading = false,
  onPress,
  style,
  variant = 'primary',
  size = 'md',
  ...props
}: ShelfieButtonProps) {
  const palette = variants[variant];
  const isDisabled = disabled || loading;
  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <ShelfieText
        variant="button"
        style={{
          color: palette.foregroundColor,
          ...(variant === 'ghost' || variant === 'destructive'
            ? ShelfieTypography.label
            : {}),
        }}>
        {children}
      </ShelfieText>
    ) : (
      children
    );

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderCurve: 'continuous',
          borderRadius: ShelfieRadius.lg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          justifyContent: 'center',
          opacity: isDisabled ? 0.45 : pressed ? 0.78 : 1,
          ...sizes[size],
          ...(variant === 'primary' ? { boxShadow: ShelfieShadows.raised } : {}),
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.foregroundColor} />
      ) : content}
    </Pressable>
  );
}

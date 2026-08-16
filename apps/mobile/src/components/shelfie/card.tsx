import { View, type ViewProps } from 'react-native';

import { ShelfieColors, ShelfieRadius, ShelfieShadows, ShelfieSpacing } from '@/constants/theme';

export type ShelfieCardTone = 'default' | 'tinted';

export type ShelfieCardProps = ViewProps & {
  tone?: ShelfieCardTone;
};

export function ShelfieCard({ style, tone = 'default', ...props }: ShelfieCardProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: tone === 'tinted' ? ShelfieColors.surfaceTint : ShelfieColors.surface,
          borderColor: ShelfieColors.borderSoft,
          borderCurve: 'continuous',
          borderRadius: ShelfieRadius.lg,
          borderWidth: 1,
          padding: ShelfieSpacing.md,
          boxShadow: ShelfieShadows.card,
        },
        style,
      ]}
    />
  );
}

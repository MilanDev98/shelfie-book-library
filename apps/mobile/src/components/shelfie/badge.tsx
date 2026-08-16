import { View, type StyleProp, type ViewStyle } from 'react-native';

import {
  ShelfieColors,
  ShelfieRadius,
  ShelfieSpacing,
  type ShelfieBookStatus,
} from '@/constants/theme';

import { ShelfieText } from './text';

const statusStyles = {
  matched: { backgroundColor: ShelfieColors.matchedTint, color: ShelfieColors.matched, label: 'Matched' },
  saved: { backgroundColor: ShelfieColors.matchedTint, color: ShelfieColors.matched, label: 'Added' },
  review: { backgroundColor: ShelfieColors.reviewTint, color: ShelfieColors.review, label: 'Needs Review' },
  unreadable: { backgroundColor: ShelfieColors.surfaceTint, color: ShelfieColors.muted, label: 'Unreadable' },
  'no-match': { backgroundColor: ShelfieColors.noMatchTint, color: ShelfieColors.noMatch, label: 'No Match' },
} as const;

export type StatusBadgeProps = {
  status: ShelfieBookStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function StatusBadge({ label, status, style }: StatusBadgeProps) {
  const palette = statusStyles[status];

  return (
    <View
      accessible
      accessibilityLabel={label ?? palette.label}
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: palette.backgroundColor,
          borderRadius: ShelfieRadius.sm,
          paddingHorizontal: ShelfieSpacing.xs,
          paddingVertical: ShelfieSpacing.xxs,
        },
        style,
      ]}>
      <ShelfieText variant="badge" style={{ color: palette.color }}>
        {label ?? palette.label}
      </ShelfieText>
    </View>
  );
}

export type ConfidenceBadgeTone = 'high' | 'medium' | 'low';

type ConfidenceBadgeProps = {
  confidence: number;
  tone?: ConfidenceBadgeTone;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const confidenceStyles = {
  high: { backgroundColor: ShelfieColors.matchedTint, color: ShelfieColors.matched, label: 'High' },
  medium: { backgroundColor: ShelfieColors.reviewTint, color: ShelfieColors.review, label: 'Medium' },
  low: { backgroundColor: ShelfieColors.noMatchTint, color: ShelfieColors.noMatch, label: 'Low' },
} as const;

export function ConfidenceBadge({ confidence, label, style, tone }: ConfidenceBadgeProps) {
  const resolvedTone = tone ?? (confidence >= 85 ? 'high' : confidence >= 60 ? 'medium' : 'low');
  const palette = confidenceStyles[resolvedTone];
  const clampedConfidence = Math.max(0, Math.min(100, Math.round(confidence)));

  return (
    <View
      accessible
      accessibilityLabel={`${clampedConfidence}% confidence, ${label ?? palette.label}`}
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: palette.backgroundColor,
          borderRadius: ShelfieRadius.sm,
          paddingHorizontal: ShelfieSpacing.xs,
          paddingVertical: ShelfieSpacing.xxs,
        },
        style,
      ]}>
      <ShelfieText variant="badge" style={{ color: palette.color }}>
        {clampedConfidence}% · {label ?? palette.label}
      </ShelfieText>
    </View>
  );
}

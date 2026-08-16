import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  ShelfieColors,
  ShelfieRadius,
  ShelfieSpacing,
} from '@/constants/theme';

import { ShelfieButton } from './button';
import { ShelfieCard } from './card';
import { ShelfieText, type ShelfieTextVariant } from './text';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  titleVariant?: ShelfieTextVariant;
  descriptionVariant?: ShelfieTextVariant;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  actionLabel,
  description,
  icon,
  onAction,
  descriptionVariant = 'body',
  style,
  title,
  titleVariant = 'display',
}: EmptyStateProps) {
  return (
    <ShelfieCard style={[styles.container, style]}>
      <View style={styles.icon}>{icon ?? <ShelfieText variant="display">⌂</ShelfieText>}</View>
      <ShelfieText variant={titleVariant} style={styles.title}>
        {title}
      </ShelfieText>
      <ShelfieText variant={descriptionVariant} style={styles.description}>
        {description}
      </ShelfieText>
      {actionLabel && onAction ? (
        <ShelfieButton onPress={onAction} size="md" style={styles.action}>
          {actionLabel}
        </ShelfieButton>
      ) : null}
    </ShelfieCard>
  );
}

type ErrorStateProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  retainedPhotoLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({
  description,
  icon,
  onRetry,
  onSecondaryAction,
  retainedPhotoLabel,
  retryLabel = 'Try Again',
  secondaryLabel,
  style,
  title = "We couldn't finish the analysis",
}: ErrorStateProps) {
  return (
    <View style={[styles.errorContainer, style]}>
      <View style={styles.errorIcon}>{icon ?? <ShelfieText variant="display">!</ShelfieText>}</View>
      <ShelfieText variant="display" style={styles.errorTitle}>
        {title}
      </ShelfieText>
      <ShelfieText variant="body" style={styles.description}>
        {description}
      </ShelfieText>
      {retainedPhotoLabel ? (
        <ShelfieCard tone="tinted" style={styles.retainedPhoto}>
          <ShelfieText variant="bodyStrong">Photo retained</ShelfieText>
          <ShelfieText variant="caption" style={styles.retainedCopy}>
            {retainedPhotoLabel}
          </ShelfieText>
        </ShelfieCard>
      ) : null}
      <View style={styles.actions}>
        {onRetry ? (
          <ShelfieButton onPress={onRetry} size="lg">
            {retryLabel}
          </ShelfieButton>
        ) : null}
        {secondaryLabel && onSecondaryAction ? (
          <ShelfieButton onPress={onSecondaryAction} size="md" variant="secondary">
            {secondaryLabel}
          </ShelfieButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: ShelfieSpacing.xl,
    paddingVertical: ShelfieSpacing.xxl,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.surfaceTint,
    borderRadius: ShelfieRadius.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  title: {
    marginTop: ShelfieSpacing.lg,
    textAlign: 'center',
  },
  description: {
    maxWidth: 280,
    marginTop: ShelfieSpacing.xs,
    textAlign: 'center',
  },
  action: {
    marginTop: ShelfieSpacing.lg,
  },
  errorContainer: {
    alignItems: 'flex-start',
    padding: ShelfieSpacing.xl,
  },
  errorIcon: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.noMatchTint,
    borderRadius: ShelfieRadius.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  errorTitle: {
    marginTop: ShelfieSpacing.lg,
    maxWidth: 300,
  },
  retainedPhoto: {
    alignSelf: 'stretch',
    marginTop: ShelfieSpacing.lg,
  },
  retainedCopy: {
    marginTop: ShelfieSpacing.xxs,
  },
  actions: {
    alignSelf: 'stretch',
    gap: ShelfieSpacing.xs,
    marginTop: ShelfieSpacing.lg,
  },
});

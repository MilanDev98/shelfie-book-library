import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  ShelfieColors,
  ShelfieRadius,
  ShelfieSpacing,
} from '@/constants/theme';

import { ShelfieCard } from './card';
import { ShelfieText } from './text';

type ProcessingStateProps = {
  steps?: readonly string[];
  activeStep?: number;
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

const defaultSteps = ['Finding book spines', 'Reading titles and authors', 'Matching books to the catalog'];

export function ShelfieProcessingState({
  activeStep = 0,
  description = "We'll hand anything uncertain back to you for review.",
  steps = defaultSteps,
  style,
  title = 'Analyzing your bookshelf',
}: ProcessingStateProps) {
  const currentStep = Math.max(0, Math.min(activeStep, steps.length - 1));

  return (
    <ShelfieCard accessibilityRole="progressbar" style={style}>
      <View style={styles.heading}>
        <View style={styles.spinner}>
          <ActivityIndicator color={ShelfieColors.primary} />
        </View>
        <View style={styles.headingCopy}>
          <ShelfieText variant="title">{title}</ShelfieText>
          <ShelfieText variant="caption" style={styles.description}>
            {description}
          </ShelfieText>
        </View>
      </View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const active = index === currentStep;

          return (
            <View key={step} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  complete && styles.completeDot,
                  active && styles.activeDot,
                ]}>
                {complete ? <ShelfieText style={styles.checkmark}>✓</ShelfieText> : null}
              </View>
              <ShelfieText
                variant="label"
                style={{ color: active || complete ? ShelfieColors.body : ShelfieColors.quiet }}>
                {step}
              </ShelfieText>
            </View>
          );
        })}
      </View>
    </ShelfieCard>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: ShelfieSpacing.md,
  },
  spinner: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.surfaceTint,
    borderRadius: ShelfieRadius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headingCopy: {
    flex: 1,
    gap: ShelfieSpacing.xxs,
  },
  description: {
    maxWidth: 260,
  },
  steps: {
    borderLeftColor: ShelfieColors.border,
    borderLeftWidth: 1,
    gap: ShelfieSpacing.sm,
    marginLeft: 21,
    marginTop: ShelfieSpacing.lg,
    paddingLeft: ShelfieSpacing.lg,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: ShelfieSpacing.sm,
    marginLeft: -29,
  },
  stepDot: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.paper,
    borderColor: ShelfieColors.border,
    borderRadius: ShelfieRadius.full,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  activeDot: {
    backgroundColor: ShelfieColors.primary,
    borderColor: ShelfieColors.primary,
  },
  completeDot: {
    backgroundColor: ShelfieColors.matched,
    borderColor: ShelfieColors.matched,
  },
  checkmark: {
    color: ShelfieColors.onPrimary,
    fontSize: 12,
    lineHeight: 14,
  },
});

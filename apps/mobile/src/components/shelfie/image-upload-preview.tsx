import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  ShelfieColors,
  ShelfieRadius,
  ShelfieSpacing,
  ShelfieTypography,
} from '@/constants/theme';

import { ShelfieButton } from './button';
import { ShelfieText } from './text';

type ImageUploadPreviewProps = {
  imageUri?: string | null;
  title?: string;
  description?: string;
  onTakePhoto?: () => void;
  onChoosePhoto?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ImageUploadPreview({
  description = 'Take a clear photo of the book spines you want Shelfie to identify.',
  disabled = false,
  imageUri,
  onChoosePhoto,
  onRemove,
  onTakePhoto,
  style,
  title = 'Add a bookshelf photo',
}: ImageUploadPreviewProps) {
  const hasImage = Boolean(imageUri);

  return (
    <View style={[styles.container, style]}>
      {hasImage ? (
        <View style={styles.previewFrame}>
          <Image
            accessibilityLabel="Selected bookshelf photo"
            contentFit="cover"
            source={{ uri: imageUri ?? undefined }}
            style={styles.previewImage}
          />
          <View style={styles.previewOverlay}>
            <ShelfieText variant="caption" style={styles.previewLabel}>
              Ready to analyze
            </ShelfieText>
            {onRemove ? (
              <Pressable
                accessibilityLabel="Remove selected photo"
                accessibilityRole="button"
                disabled={disabled}
                onPress={onRemove}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                <ShelfieText variant="label" style={styles.removeText}>
                  Remove
                </ShelfieText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.emptyFrame}>
          <View style={styles.uploadIcon}>
            <ShelfieText variant="display" style={styles.plus}>
              +
            </ShelfieText>
          </View>
          <ShelfieText variant="title" style={styles.emptyTitle}>
            {title}
          </ShelfieText>
          <ShelfieText variant="caption" style={styles.emptyDescription}>
            {description}
          </ShelfieText>
        </View>
      )}

      <View style={styles.actions}>
        <ShelfieButton disabled={disabled} onPress={onTakePhoto} size="lg">
          {hasImage ? 'Analyze Photo' : 'Take a Photo'}
        </ShelfieButton>
        <ShelfieButton disabled={disabled} onPress={onChoosePhoto} size="md" variant="secondary">
          {hasImage ? 'Choose Different Photo' : 'Choose from Library'}
        </ShelfieButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: ShelfieSpacing.md,
  },
  emptyFrame: {
    alignItems: 'center',
    borderColor: ShelfieColors.border,
    borderCurve: 'continuous',
    borderRadius: ShelfieRadius.xl,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    minHeight: 240,
    justifyContent: 'center',
    paddingHorizontal: ShelfieSpacing.xl,
    paddingVertical: ShelfieSpacing.xxl,
  },
  uploadIcon: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.surfaceTint,
    borderRadius: ShelfieRadius.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  plus: {
    color: ShelfieColors.primary,
    fontFamily: ShelfieTypography.display.fontFamily,
    fontSize: 30,
    lineHeight: 34,
  },
  emptyTitle: {
    marginTop: ShelfieSpacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: ShelfieSpacing.xs,
    maxWidth: 250,
    textAlign: 'center',
  },
  previewFrame: {
    backgroundColor: ShelfieColors.spine,
    borderCurve: 'continuous',
    borderRadius: ShelfieRadius.xl,
    height: 280,
    overflow: 'hidden',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewOverlay: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    padding: ShelfieSpacing.md,
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
  },
  previewLabel: {
    color: ShelfieColors.onPrimary,
  },
  removeButton: {
    borderColor: 'rgba(251, 249, 244, 0.55)',
    borderRadius: ShelfieRadius.sm,
    borderWidth: 1,
    paddingHorizontal: ShelfieSpacing.sm,
    paddingVertical: ShelfieSpacing.xxs,
  },
  removeText: {
    color: ShelfieColors.onPrimary,
  },
  actions: {
    gap: ShelfieSpacing.xs,
  },
  pressed: {
    opacity: 0.78,
  },
});

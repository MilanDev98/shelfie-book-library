import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  ShelfieColors,
  ShelfieRadius,
  ShelfieSpacing,
  type ShelfieBookStatus,
} from '@/constants/theme';

import { ConfidenceBadge, StatusBadge } from './badge';
import { getBookInitial } from './book-initial';
import { ShelfieCard } from './card';
import { ShelfieText } from './text';

export type ShelfieReviewBook = {
  id: string;
  title?: string | null;
  author?: string | null;
  detectedTitle?: string | null;
  detectedAuthor?: string | null;
  confidence?: number | null;
  status: ShelfieBookStatus;
  spineColor?: string;
};

type ReviewContentProps = {
  book: ShelfieReviewBook;
  showDetectedText?: boolean;
};

function ReviewContent({ book, showDetectedText = false }: ReviewContentProps) {
  const title = book.title || book.detectedTitle || 'Unknown book';
  const author = book.author || book.detectedAuthor || 'Author not identified';

  return (
    <>
      <View style={styles.spine}>
        <ShelfieText variant="badge" style={styles.spineLabel}>
          {getBookInitial(book.title || book.detectedTitle)}
        </ShelfieText>
      </View>
      <View style={styles.copy}>
        <View style={styles.badges}>
          <StatusBadge status={book.status} />
          {book.confidence != null ? <ConfidenceBadge confidence={book.confidence} /> : null}
        </View>
        <ShelfieText variant="bodyStrong" numberOfLines={2} style={styles.title}>
          {title}
        </ShelfieText>
        <ShelfieText variant="caption" numberOfLines={1}>
          {author}
        </ShelfieText>
        {showDetectedText && (book.detectedTitle || book.detectedAuthor) ? (
          <ShelfieText variant="caption" color="quiet" numberOfLines={2} style={styles.detected}>
            Detected: {book.detectedTitle || 'Unreadable'}
            {book.detectedAuthor ? ` · ${book.detectedAuthor}` : ''}
          </ShelfieText>
        ) : null}
      </View>
    </>
  );
}

export type ReviewRowProps = Omit<PressableProps, 'children' | 'style'> & {
  book: ShelfieReviewBook;
  showDetectedText?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ReviewRow({ book, showDetectedText = false, style, ...props }: ReviewRowProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}>
      <ReviewContent book={book} showDetectedText={showDetectedText} />
    </Pressable>
  );
}

export type ReviewCardProps = ReviewContentProps & {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ReviewCard({ book, onPress, showDetectedText = true, style }: ReviewCardProps) {
  const content = <ReviewContent book={book} showDetectedText={showDetectedText} />;

  if (!onPress) {
    return <ShelfieCard style={[styles.card, style]}>{content}</ShelfieCard>;
  }

  return (
    <ShelfieCard style={[styles.card, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}>
        {content}
      </Pressable>
    </ShelfieCard>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.surface,
    borderColor: ShelfieColors.borderSoft,
    borderCurve: 'continuous',
    borderRadius: ShelfieRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: ShelfieSpacing.md,
    minHeight: 72,
    padding: ShelfieSpacing.sm,
  },
  card: {
    padding: ShelfieSpacing.sm,
  },
  cardPressable: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: ShelfieSpacing.md,
  },
  spine: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.spine,
    borderRadius: ShelfieRadius.sm,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 34,
  },
  spineLabel: {
    color: 'rgba(251, 249, 244, 0.82)',
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  badges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ShelfieSpacing.xs,
  },
  title: {
    marginTop: ShelfieSpacing.xs,
  },
  detected: {
    marginTop: ShelfieSpacing.xs,
  },
  pressed: {
    opacity: 0.78,
  },
});

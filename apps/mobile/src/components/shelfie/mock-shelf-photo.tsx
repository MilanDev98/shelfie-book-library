import { StyleSheet, View } from 'react-native';

import { ShelfieColors, ShelfieRadius } from '@/constants/theme';

import { ShelfieText } from './text';

const spines = [
  ['1984', '#7E4A3A', 0.82],
  ['DUNE', '#2F5E58', 0.94],
  ['THE MIDNIGHT LIBRARY', '#B27B3C', 0.74],
  ['NORMAL PEOPLE', '#74634F', 0.88],
  ['HARRY POTTER', '#4F5D3D', 0.98],
  ['THE WAVE', '#6A4850', 0.79],
  ['ATOMIC HABITS', '#B6A36B', 0.9],
  ['MARCH', '#41586B', 0.7],
  ['THE SECRET HISTORY', '#7C6250', 0.87],
] as const;

type MockShelfPhotoProps = {
  compact?: boolean;
  muted?: boolean;
};

export function MockShelfPhoto({ compact = false, muted = false }: MockShelfPhotoProps) {
  return (
    <View style={[styles.photo, compact ? styles.compactPhoto : styles.largePhoto]}>
      <View style={styles.warmGlow} />
      <View style={[styles.books, compact && styles.compactBooks]}>
        {spines.map(([label, color, height]) => (
          <View
            key={label}
            style={[
              styles.spine,
              { backgroundColor: color, height: `${height * 100}%` },
              muted && styles.muted,
            ]}>
            {!compact ? <ShelfieText variant="badge" style={styles.spineLabel}>{label}</ShelfieText> : null}
          </View>
        ))}
      </View>
      <View style={styles.shelf} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: ShelfieColors.spine,
    borderRadius: ShelfieRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  largePhoto: { height: 280, width: '100%' },
  compactPhoto: { height: 70, width: 52, borderRadius: ShelfieRadius.sm },
  warmGlow: {
    backgroundColor: 'rgba(255, 246, 224, 0.12)',
    height: '65%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  books: {
    alignItems: 'flex-end',
    bottom: 12,
    flexDirection: 'row',
    gap: 4,
    left: 14,
    position: 'absolute',
    right: 14,
    top: 54,
  },
  compactBooks: { bottom: 5, gap: 1, left: 4, right: 4, top: 9 },
  spine: {
    borderRadius: 2,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  muted: { opacity: 0.55 },
  spineLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 6,
    lineHeight: 7,
    maxHeight: '90%',
    textAlign: 'center',
    transform: [{ rotate: '180deg' }],
  },
  shelf: {
    backgroundColor: '#3A322B',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    bottom: 0,
    height: 12,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});

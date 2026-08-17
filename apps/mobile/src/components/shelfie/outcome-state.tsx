/* eslint-disable react/no-unescaped-entities */
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ShelfieColors, ShelfieRadius } from '@/constants/theme';

import { ShelfieButton } from './button';
import { ShelfieCard } from './card';
import { ShelfieText } from './text';

export type ShelfieOutcome = 'nobooks' | 'nomatch' | 'unreadable' | 'error' | 'timeout';

type OutcomeBook = {
  detectedTitle: string;
  detectedAuthor: string;
};

type OutcomeStateProps = {
  state: ShelfieOutcome;
  book?: OutcomeBook;
  photoUri?: string | null;
  errorMessage?: string | null;
  onBack: () => void;
  onChoosePhoto: () => void;
  onCorrect: () => void;
  onDiscard: () => void;
  onRetry: () => void;
};

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={ShelfieColors.primary} weight="regular" />
      </Pressable>
      <ShelfieText variant="title" style={styles.headerTitle}>{title}</ShelfieText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

function PhotoReference({ photoUri }: { photoUri?: string | null }) {
  return (
    <View style={styles.photoCard}>
      {photoUri ? (
        <Image accessibilityLabel="Selected bookshelf photo" contentFit="cover" source={{ uri: photoUri }} style={styles.photo} />
      ) : (
        <View style={styles.photoFallback}>
          <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={24} tintColor={ShelfieColors.quiet} weight="regular" />
        </View>
      )}
      <View style={styles.photoCopy}>
        <ShelfieText variant="badge" color="quiet">SELECTED SHELF PHOTO</ShelfieText>
        <ShelfieText variant="caption" color="muted" style={styles.photoDescription}>
          {photoUri ? 'This is the photo you selected. It remains available locally while you review the result.' : 'No shelf photo is currently available.'}
        </ShelfieText>
      </View>
    </View>
  );
}

function Unreadable({ photoUri, onBack, onCorrect, onDiscard }: OutcomeStateProps) {
  return <View style={styles.flex}><Header title="Review Book" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><PhotoReference photoUri={photoUri} /><ShelfieCard tone="tinted" style={styles.alertCard}><View style={styles.alertIcon}><ShelfieText style={styles.alertGlyph}>!</ShelfieText></View><ShelfieText variant="title" style={styles.alertTitle}>We couldn't read this book</ShelfieText><ShelfieText variant="body" color="muted" style={styles.alertCopy}>The book was detected, but the title or author wasn't clear enough.</ShelfieText></ShelfieCard></ScrollView><Footer><ShelfieButton size="lg" onPress={onCorrect}>Find Book Manually</ShelfieButton><ShelfieButton size="sm" variant="destructive" onPress={onDiscard}>Discard</ShelfieButton></Footer></View>;
}

function NoMatch({ book, photoUri, onBack, onCorrect, onDiscard }: OutcomeStateProps) {
  return <View style={styles.flex}><Header title="Review Book" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><PhotoReference photoUri={photoUri} /><View style={styles.detectedHeading}><ShelfieText variant="badge" color="quiet" style={styles.formLabel}>DETECTED</ShelfieText><View style={styles.noMatchBadge}><ShelfieText variant="badge" style={styles.noMatchText}>No Match</ShelfieText></View></View><ShelfieCard tone="tinted" style={styles.detectedCard}><ShelfieText variant="bodyStrong">“{book?.detectedTitle ?? 'Unreadable'}”</ShelfieText><ShelfieText variant="body" color="quiet">“{book?.detectedAuthor ?? 'Author not identified'}”</ShelfieText></ShelfieCard><ShelfieCard tone="tinted" style={styles.alertCard}><View style={styles.alertIcon}><ShelfieText style={styles.alertGlyph}>⌕</ShelfieText></View><ShelfieText variant="title" style={styles.alertTitle}>We couldn't match this book</ShelfieText><ShelfieText variant="body" color="muted" style={styles.alertCopy}>No catalog result was close enough to the detected text, so there is nothing to confirm. Search the catalog yourself, or discard the detection.</ShelfieText></ShelfieCard></ScrollView><Footer><ShelfieButton size="lg" onPress={onCorrect}>Find Match Manually</ShelfieButton><ShelfieButton size="sm" variant="destructive" onPress={onDiscard}>Discard Detection</ShelfieButton><ShelfieText variant="caption" color="quiet" style={styles.footerNote}>Discarding removes the detection only — nothing is saved to your library.</ShelfieText></Footer></View>;
}

function NoBooks({ photoUri, onBack, onChoosePhoto, onRetry }: OutcomeStateProps) {
  return <View style={styles.flex}><Header title="Analysis Result" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><View style={styles.outcomeIcon}><ShelfieText style={styles.outcomeGlyph}>⌕</ShelfieText></View><ShelfieText variant="display" style={styles.outcomeTitle}>No books detected</ShelfieText><ShelfieText variant="body" color="muted" style={styles.outcomeCopy}>We couldn't find clear book spines in this photo.</ShelfieText><ShelfieCard style={styles.tryCard}><ShelfieText variant="badge" color="quiet" style={styles.formLabel}>TRY THIS</ShelfieText>{['Move closer to the bookshelf', 'Keep book spines visible', 'Avoid glare', 'Try taking the photo straight on'].map((tip) => <ShelfieText key={tip} variant="body" style={styles.tip}>•  {tip}</ShelfieText>)}</ShelfieCard><View style={styles.retained}><PhotoReference photoUri={photoUri} /></View></ScrollView><Footer><ShelfieButton size="lg" onPress={onRetry}>Try Another Photo</ShelfieButton><ShelfieButton size="md" variant="secondary" onPress={onChoosePhoto}>Choose Existing Photo</ShelfieButton></Footer></View>;
}

function ErrorOutcome({ photoUri, errorMessage, state, onBack, onChoosePhoto, onRetry }: OutcomeStateProps) {
  const timeout = state === 'timeout';
  return <View style={styles.flex}><Header title="Analysis" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><View style={[styles.outcomeIcon, timeout ? styles.timeoutIcon : styles.errorIcon]}><ShelfieText style={[styles.outcomeGlyph, timeout ? styles.timeoutGlyph : styles.errorGlyph]}>{timeout ? '◷' : '!'}</ShelfieText></View><ShelfieText variant="display" style={styles.outcomeTitle}>{timeout ? 'Analysis is taking too long' : "We couldn't finish the analysis"}</ShelfieText><ShelfieText variant="body" color="muted" style={styles.outcomeCopy}>{errorMessage ?? (timeout ? "We couldn't complete the analysis right now." : 'Something went wrong while processing this bookshelf. Your photo is still available, so you can try again.')}</ShelfieText><View style={styles.retained}><PhotoReference photoUri={photoUri} /></View>{timeout ? <View style={styles.infoNote}><ShelfieText variant="caption" color="quiet">ⓘ  A weak connection is the usual cause. Nothing has been saved or lost.</ShelfieText></View> : null}</ScrollView><Footer><ShelfieButton size="lg" onPress={onRetry}>Try Again</ShelfieButton><ShelfieButton size="md" variant="secondary" onPress={timeout ? onBack : onChoosePhoto}>{timeout ? 'Back to Scan' : 'Choose Another Photo'}</ShelfieButton></Footer></View>;
}

export function OutcomeState(props: OutcomeStateProps) {
  if (props.state === 'nobooks') return <NoBooks {...props} />;
  if (props.state === 'nomatch') return <NoMatch {...props} />;
  if (props.state === 'unreadable') return <Unreadable {...props} />;
  return <ErrorOutcome {...props} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingBottom: 12, paddingHorizontal: 20, paddingTop: 4, width: '100%' },
  backButton: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderColor: ShelfieColors.border, borderRadius: ShelfieRadius.md, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  headerTitle: { flex: 1 },
  headerSpacer: { width: 38 },
  content: { alignSelf: 'center', maxWidth: 520, paddingBottom: 22, paddingHorizontal: 20, paddingTop: 4, width: '100%' },
  footer: { backgroundColor: ShelfieColors.paper, borderTopColor: '#EEE8DC', borderTopWidth: 1, gap: 9, paddingBottom: 26, paddingHorizontal: 20, paddingTop: 13, width: '100%' },
  photoCard: { alignItems: 'center', backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.lg, flexDirection: 'row', gap: 14, overflow: 'hidden', padding: 12 },
  photo: { backgroundColor: ShelfieColors.spine, borderRadius: ShelfieRadius.sm, height: 82, width: 66 },
  photoFallback: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderRadius: ShelfieRadius.sm, height: 82, justifyContent: 'center', width: 66 },
  photoCopy: { flex: 1 },
  photoDescription: { marginTop: 7 },
  alertCard: { backgroundColor: '#FDF7F4', borderColor: '#F0DCD3', marginTop: 22 },
  alertIcon: { alignItems: 'center', backgroundColor: ShelfieColors.noMatchTint, borderRadius: ShelfieRadius.md, height: 38, justifyContent: 'center', width: 38 },
  alertGlyph: { color: ShelfieColors.noMatch, fontSize: 22, lineHeight: 24 },
  alertTitle: { marginTop: 14 },
  alertCopy: { marginTop: 7 },
  detectedHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 22 },
  formLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  noMatchBadge: { backgroundColor: ShelfieColors.noMatchTint, borderRadius: ShelfieRadius.sm, paddingHorizontal: 8, paddingVertical: 5 },
  noMatchText: { color: ShelfieColors.noMatch },
  detectedCard: { marginTop: 11 },
  outcomeIcon: { alignItems: 'center', backgroundColor: ShelfieColors.surfaceTint, borderColor: '#E4E0CF', borderRadius: 18, borderWidth: 1, height: 56, justifyContent: 'center', width: 56 },
  outcomeGlyph: { color: ShelfieColors.quiet, fontSize: 28, lineHeight: 30 },
  outcomeTitle: { marginTop: 20, maxWidth: 310 },
  outcomeCopy: { marginTop: 9 },
  tryCard: { marginTop: 24 },
  tip: { marginTop: 11 },
  retained: { marginTop: 18 },
  errorIcon: { backgroundColor: ShelfieColors.noMatchTint, borderWidth: 0 },
  errorGlyph: { color: ShelfieColors.noMatch },
  timeoutIcon: { backgroundColor: ShelfieColors.reviewTint, borderWidth: 0 },
  timeoutGlyph: { color: ShelfieColors.review },
  infoNote: { marginTop: 16 },
  footerNote: { textAlign: 'center' },
});

/* eslint-disable react/no-unescaped-entities */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';

import { ShelfieColors, ShelfieRadius } from '@/constants/theme';

import { MockShelfPhoto } from './mock-shelf-photo';
import { ShelfieButton } from './button';
import { ShelfieCard } from './card';
import { ShelfieText } from './text';

export type ShelfieOutcome = 'nobooks' | 'nomatch' | 'unreadable' | 'error' | 'timeout';

type OutcomeBook = {
  title: string;
  detectedTitle: string;
  detectedAuthor: string;
  spineColor: string;
};

type OutcomeStateProps = {
  state: ShelfieOutcome;
  book: OutcomeBook;
  onBack: () => void;
  onChoosePhoto: () => void;
  onCorrect: () => void;
  onDiscard: () => void;
  onRetry: () => void;
};

function Header({ title, onBack, progress }: { title: string; onBack: () => void; progress?: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={ShelfieColors.primary} weight="regular" />
      </Pressable>
      <ShelfieText variant="title" style={styles.headerTitle}>{title}</ShelfieText>
      {progress ? <ShelfieText variant="caption" color="quiet" style={styles.progress}>{progress}</ShelfieText> : <View style={styles.headerSpacer} />}
    </View>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

function SpineCrop({ book, unreadable = false }: { book: OutcomeBook; unreadable?: boolean }) {
  return (
    <View style={styles.cropCard}>
      <View style={[styles.cropSpine, { backgroundColor: unreadable ? '#4A4238' : book.spineColor }]}>
        <ShelfieText variant="badge" style={styles.cropSpineText}>{unreadable ? '····' : book.title}</ShelfieText>
      </View>
      <View>
        <ShelfieText variant="badge" style={styles.cropLabel}>SPINE CROP</ShelfieText>
        <ShelfieText variant="caption" style={styles.cropCopy}>{unreadable ? 'Glare across this spine hid the text.' : 'Cropped from your photo, shelf position 5.'}</ShelfieText>
      </View>
    </View>
  );
}

function ReviewProgress({ children }: { children: ReactNode }) {
  return <><View style={styles.progressTrack}><View style={styles.progressFill} /></View>{children}</>;
}

function Unreadable({ book, onBack, onCorrect, onDiscard }: OutcomeStateProps) {
  return <View style={styles.flex}><Header title="Review Book" progress="3 of 3" onBack={onBack} /><ReviewProgress><ScrollView contentContainerStyle={styles.content}><SpineCrop book={book} unreadable /><ShelfieCard tone="tinted" style={styles.alertCard}><View style={styles.alertIcon}><ShelfieText style={styles.alertGlyph}>!</ShelfieText></View><ShelfieText variant="title" style={styles.alertTitle}>We couldn't read this book</ShelfieText><ShelfieText variant="body" color="muted" style={styles.alertCopy}>The book was detected, but the title or author wasn't clear enough.</ShelfieText></ShelfieCard></ScrollView></ReviewProgress><Footer><ShelfieButton size="lg" onPress={onCorrect}>Find Book Manually</ShelfieButton><ShelfieButton size="sm" variant="destructive" onPress={onDiscard}>Discard</ShelfieButton></Footer></View>;
}

function NoMatch({ book, onBack, onCorrect, onDiscard }: OutcomeStateProps) {
  return <View style={styles.flex}><Header title="Review Book" progress="2 of 3" onBack={onBack} /><ReviewProgress><ScrollView contentContainerStyle={styles.content}><SpineCrop book={book} /><View style={styles.detectedHeading}><ShelfieText variant="badge" color="quiet" style={styles.formLabel}>DETECTED</ShelfieText><View style={styles.noMatchBadge}><ShelfieText variant="badge" style={styles.noMatchText}>No Match</ShelfieText></View></View><ShelfieCard tone="tinted" style={styles.detectedCard}><ShelfieText variant="bodyStrong">“{book.detectedTitle}”</ShelfieText><ShelfieText variant="body" color="quiet">“{book.detectedAuthor}”</ShelfieText></ShelfieCard><ShelfieCard tone="tinted" style={styles.alertCard}><View style={styles.alertIcon}><ShelfieText style={styles.alertGlyph}>⌕</ShelfieText></View><ShelfieText variant="title" style={styles.alertTitle}>We couldn't match this book</ShelfieText><ShelfieText variant="body" color="muted" style={styles.alertCopy}>No catalog result was close enough to the detected text, so there is nothing to confirm. Search the catalog yourself, or discard the detection.</ShelfieText></ShelfieCard></ScrollView></ReviewProgress><Footer><ShelfieButton size="lg" onPress={onCorrect}>Find Match Manually</ShelfieButton><ShelfieButton size="sm" variant="destructive" onPress={onDiscard}>Discard Detection</ShelfieButton><ShelfieText variant="caption" color="quiet" style={styles.footerNote}>Discarding removes the detection only — nothing is saved to your library.</ShelfieText></Footer></View>;
}

function NoBooks({ onBack, onChoosePhoto, onRetry }: OutcomeStateProps) {
  return <View style={styles.flex}><Header title="Analysis Result" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><View style={styles.outcomeIcon}><ShelfieText style={styles.outcomeGlyph}>⌕</ShelfieText></View><ShelfieText variant="display" style={styles.outcomeTitle}>No books detected</ShelfieText><ShelfieText variant="body" color="muted" style={styles.outcomeCopy}>We couldn't find clear book spines in this photo.</ShelfieText><ShelfieCard style={styles.tryCard}><ShelfieText variant="badge" color="quiet" style={styles.formLabel}>TRY THIS</ShelfieText>{['Move closer to the bookshelf', 'Keep book spines visible', 'Avoid glare', 'Try taking the photo straight on'].map((tip) => <ShelfieText key={tip} variant="body" style={styles.tip}>•  {tip}</ShelfieText>)}</ShelfieCard><View style={styles.retained}><MockShelfPhoto compact muted /><ShelfieText variant="caption" color="quiet" style={styles.retainedCopy}>Your photo is still here if you want to look at it again.</ShelfieText></View></ScrollView><Footer><ShelfieButton size="lg" onPress={onRetry}>Try Another Photo</ShelfieButton><ShelfieButton size="md" variant="secondary" onPress={onChoosePhoto}>Choose Existing Photo</ShelfieButton></Footer></View>;
}

function ErrorOutcome({ state, onBack, onChoosePhoto, onRetry }: OutcomeStateProps) {
  const timeout = state === 'timeout';
  return <View style={styles.flex}><Header title="Analysis" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><View style={[styles.outcomeIcon, timeout ? styles.timeoutIcon : styles.errorIcon]}><ShelfieText style={[styles.outcomeGlyph, timeout ? styles.timeoutGlyph : styles.errorGlyph]}>{timeout ? '◷' : '!'}</ShelfieText></View><ShelfieText variant="display" style={styles.outcomeTitle}>{timeout ? 'Analysis is taking too long' : "We couldn't finish the analysis"}</ShelfieText><ShelfieText variant="body" color="muted" style={styles.outcomeCopy}>{timeout ? "We couldn't complete the analysis right now." : 'Something went wrong while processing this bookshelf. Your photo is still available, so you can try again.'}</ShelfieText><ShelfieCard style={styles.photoSaved}><MockShelfPhoto compact /><View style={styles.retainedCopy}><ShelfieText variant="bodyStrong">{timeout ? 'Your photo is ready to go' : 'Shelf photo saved'}</ShelfieText><ShelfieText variant="caption" color="quiet">{timeout ? "You won't need to pick it again." : 'Nothing was added to your library.'}</ShelfieText></View></ShelfieCard>{timeout ? <View style={styles.infoNote}><ShelfieText variant="caption" color="quiet">ⓘ  A weak connection is the usual cause. Nothing has been saved or lost.</ShelfieText></View> : null}</ScrollView><Footer><ShelfieButton size="lg" onPress={onRetry}>Try Again</ShelfieButton><ShelfieButton size="md" variant="secondary" onPress={timeout ? onBack : onChoosePhoto}>{timeout ? 'Back to Scan' : 'Choose Another Photo'}</ShelfieButton></Footer></View>;
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
  backArrow: { color: ShelfieColors.primary, fontSize: 29, lineHeight: 30, marginTop: -4 }, headerTitle: { flex: 1 }, headerSpacer: { width: 38 }, progress: { backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.sm, paddingHorizontal: 10, paddingVertical: 7 },
  progressTrack: { backgroundColor: ShelfieColors.divider, borderRadius: ShelfieRadius.full, height: 4, marginBottom: 14, marginHorizontal: 20, overflow: 'hidden' }, progressFill: { backgroundColor: ShelfieColors.primary, borderRadius: ShelfieRadius.full, height: '100%', width: '66%' },
  content: { alignSelf: 'center', maxWidth: 520, paddingBottom: 22, paddingHorizontal: 20, paddingTop: 4, width: '100%' }, footer: { backgroundColor: ShelfieColors.paper, borderTopColor: '#EEE8DC', borderTopWidth: 1, gap: 9, paddingBottom: 26, paddingHorizontal: 20, paddingTop: 13, width: '100%' },
  cropCard: { alignItems: 'center', backgroundColor: ShelfieColors.spine, borderRadius: 18, flexDirection: 'row', gap: 16, padding: 16 }, cropSpine: { alignItems: 'center', borderRadius: 4, height: 116, justifyContent: 'center', overflow: 'hidden', width: 56 }, cropSpineText: { color: 'rgba(255,255,255,0.7)', maxHeight: 104, transform: [{ rotate: '180deg' }] }, cropLabel: { color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }, cropCopy: { color: 'rgba(255,255,255,0.72)', marginTop: 9, maxWidth: 170 },
  alertCard: { backgroundColor: '#FDF7F4', borderColor: '#F0DCD3', marginTop: 22 }, alertIcon: { alignItems: 'center', backgroundColor: ShelfieColors.noMatchTint, borderRadius: ShelfieRadius.md, height: 38, justifyContent: 'center', width: 38 }, alertGlyph: { color: ShelfieColors.noMatch, fontSize: 22, lineHeight: 24 }, alertTitle: { marginTop: 14 }, alertCopy: { marginTop: 7 }, detectedHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 22 }, formLabel: { letterSpacing: 1, textTransform: 'uppercase' }, noMatchBadge: { backgroundColor: ShelfieColors.noMatchTint, borderRadius: ShelfieRadius.sm, paddingHorizontal: 8, paddingVertical: 5 }, noMatchText: { color: ShelfieColors.noMatch }, detectedCard: { marginTop: 11 },
  outcomeIcon: { alignItems: 'center', backgroundColor: ShelfieColors.surfaceTint, borderColor: '#E4E0CF', borderRadius: 18, borderWidth: 1, height: 56, justifyContent: 'center', width: 56 }, outcomeGlyph: { color: ShelfieColors.quiet, fontSize: 28, lineHeight: 30 }, outcomeTitle: { marginTop: 20, maxWidth: 310 }, outcomeCopy: { marginTop: 9 }, tryCard: { marginTop: 24 }, tip: { marginTop: 11 }, retained: { alignItems: 'center', backgroundColor: '#F4F1E8', borderRadius: 14, flexDirection: 'row', gap: 12, marginTop: 18, padding: 13 }, retainedCopy: { flex: 1 }, photoSaved: { alignItems: 'center', flexDirection: 'row', gap: 13, marginTop: 24 }, errorIcon: { backgroundColor: ShelfieColors.noMatchTint, borderWidth: 0 }, errorGlyph: { color: ShelfieColors.noMatch }, timeoutIcon: { backgroundColor: ShelfieColors.reviewTint, borderWidth: 0 }, timeoutGlyph: { color: ShelfieColors.review }, infoNote: { marginTop: 16 }, footerNote: { textAlign: 'center' },
});

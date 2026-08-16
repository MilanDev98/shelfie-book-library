import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShelfieButton, ShelfieCard, ShelfieText, StatusBadge, setShelfieTabBarVisible } from '@/components/shelfie';
import { ShelfieColors, ShelfieRadius, ShelfieSpacing } from '@/constants/theme';
import { getCatalogBook, type CatalogBookDetail } from '@/lib/shelfie-api';

function DeviceChrome() {
  if (Platform.OS !== 'web') return null;
  return <View style={styles.deviceStatusBar}><ShelfieText variant="label" style={styles.statusTime}>9:41</ShelfieText><View style={styles.dynamicIsland} /><View style={styles.statusIndicators}><View style={styles.signalBars}>{[5, 8, 11, 13].map((height) => <View key={height} style={[styles.signalBar, { height }]} />)}</View><View style={styles.battery}><View style={styles.batteryFill} /></View></View></View>;
}

function BookCover({ title, author, color }: { title: string; author: string; color: string }) {
  return <View accessibilityLabel={`${title} cover visual`} style={[styles.cover, { backgroundColor: color }]}><View style={styles.coverInset}><ShelfieText variant="badge" style={styles.coverBrand}>SHELFIE LIBRARY</ShelfieText><ShelfieText variant="display" style={styles.coverTitle}>{title}</ShelfieText><View style={styles.coverRule} /><ShelfieText variant="caption" style={styles.coverAuthor}>{author}</ShelfieText></View></View>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoItem}><ShelfieText variant="badge" color="quiet">{label}</ShelfieText><ShelfieText variant="bodyStrong" style={styles.infoValue}>{value}</ShelfieText></View>;
}

export default function BookDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const bookId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [book, setBook] = useState<CatalogBookDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [error, setError] = useState<string | null>(bookId ? null : 'This book link is missing a catalog ID.');

  useEffect(() => {
    setShelfieTabBarVisible(false);
    return () => setShelfieTabBarVisible(true);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!bookId) {
      return () => controller.abort();
    }
    void getCatalogBook(bookId, controller.signal).then(setBook).catch((caught) => {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'Could not load this book.');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [bookId]);

  const goToLibrary = () => {
    setShelfieTabBarVisible(true);
    router.replace('/explore');
  };
  const goToScan = () => {
    setShelfieTabBarVisible(true);
    router.push('/');
  };

  const color = bookId && bookId.charCodeAt(bookId.length - 1) % 2 === 0 ? '#2F5E58' : '#7E4A3A';

  return <View style={styles.screen}><StatusBar style="dark" /><DeviceChrome /><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}><View style={styles.flex}><View style={styles.header}><Pressable accessibilityLabel="Back to library" accessibilityRole="button" onPress={goToLibrary} style={styles.backButton}><SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={19} tintColor={ShelfieColors.primary} weight="regular" /></Pressable><ShelfieText variant="title" style={styles.headerTitle}>Book Details</ShelfieText><View style={styles.headerSpacer} /></View>{loading ? <View accessibilityLiveRegion="polite" style={styles.loadingState}><ActivityIndicator color={ShelfieColors.primary} size="large" /><ShelfieText variant="body" color="muted">Loading catalog details…</ShelfieText></View> : error || !book ? <View style={styles.errorState}><ShelfieText variant="title">Could not load this book</ShelfieText><ShelfieText variant="body" color="muted" style={styles.errorCopy}>{error ?? 'The catalog entry is unavailable.'}</ShelfieText><ShelfieButton size="md" variant="secondary" onPress={goToLibrary}>Back to Library</ShelfieButton></View> : <><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.coverWrap}><BookCover title={book.title} author={book.author} color={color} /></View><View style={styles.titleBlock}><ShelfieText variant="display" style={styles.bookTitle}>{book.title}</ShelfieText><ShelfieText variant="body" color="muted" style={styles.author}>{book.author}</ShelfieText><View style={styles.statusRow}><StatusBadge status="matched" label="In your library" /><ShelfieText variant="caption" color="quiet">Catalog ID {book.catalog_id}</ShelfieText></View></View><ShelfieCard style={styles.infoCard}><ShelfieText variant="badge" color="quiet" style={styles.sectionLabel}>CATALOG INFORMATION</ShelfieText><View style={styles.infoGrid}><InfoItem label="EDITION" value={book.edition || 'Not specified'} /><InfoItem label="CATALOG ID" value={book.catalog_id} /></View>{book.alternate_titles.length > 0 ? <View style={styles.metadataRow}><ShelfieText variant="badge" color="quiet">ALTERNATE TITLES</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.metadataValue}>{book.alternate_titles.join(' · ')}</ShelfieText></View> : null}{book.author_aliases.length > 0 ? <View style={styles.metadataRow}><ShelfieText variant="badge" color="quiet">AUTHOR ALIASES</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.metadataValue}>{book.author_aliases.join(' · ')}</ShelfieText></View> : null}{book.contained_titles.length > 0 ? <View style={styles.metadataRow}><ShelfieText variant="badge" color="quiet">CONTAINS</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.metadataValue}>{book.contained_titles.join(' · ')}</ShelfieText></View> : null}</ShelfieCard></ScrollView><View style={styles.footer}><ShelfieButton size="lg" onPress={goToScan}>Scan Another Shelf</ShelfieButton><ShelfieButton size="md" variant="secondary" onPress={goToLibrary}>Back to Library</ShelfieButton></View></>}</View></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: ShelfieColors.paper, flex: 1 },
  safeArea: { alignItems: 'center', flex: 1, width: '100%' },
  flex: { flex: 1, maxWidth: 520, width: '100%' },
  deviceStatusBar: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between', paddingHorizontal: 26, position: 'relative', width: '100%' },
  statusTime: { color: ShelfieColors.ink, fontSize: 15, fontWeight: '600', lineHeight: 15 },
  dynamicIsland: { backgroundColor: ShelfieColors.ink, borderRadius: ShelfieRadius.full, height: 28, left: '50%', position: 'absolute', top: 11, transform: [{ translateX: -52 }], width: 104 },
  statusIndicators: { alignItems: 'flex-end', flexDirection: 'row', gap: 6 },
  signalBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 2 },
  signalBar: { backgroundColor: ShelfieColors.ink, borderRadius: 1, width: 3 },
  battery: { borderColor: ShelfieColors.ink, borderRadius: 4, borderWidth: 1.5, height: 12, padding: 1.5, width: 24 },
  batteryFill: { backgroundColor: ShelfieColors.ink, borderRadius: 2, height: '100%', width: '70%' },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 52, paddingHorizontal: ShelfieSpacing.lg },
  backButton: { alignItems: 'center', borderRadius: ShelfieRadius.md, height: 40, justifyContent: 'center', marginLeft: -8, width: 40 },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 32 },
  content: { alignSelf: 'center', paddingBottom: 180, paddingHorizontal: ShelfieSpacing.lg, paddingTop: ShelfieSpacing.xs, width: '100%' },
  coverWrap: { alignItems: 'center', paddingVertical: ShelfieSpacing.sm },
  cover: { borderRadius: ShelfieRadius.md, boxShadow: '0 6px 18px rgba(28, 25, 23, 0.16)', height: 224, padding: 10, width: 158 },
  coverInset: { alignItems: 'center', borderColor: 'rgba(251, 249, 244, 0.55)', borderRadius: ShelfieRadius.sm, borderWidth: 1, flex: 1, justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 16 },
  coverBrand: { color: ShelfieColors.onPrimary, letterSpacing: 1, textAlign: 'center' },
  coverTitle: { color: ShelfieColors.onPrimary, fontSize: 27, lineHeight: 29, textAlign: 'center' },
  coverRule: { backgroundColor: ShelfieColors.reviewAccent, height: 2, width: 44 },
  coverAuthor: { color: ShelfieColors.onPrimary, textAlign: 'center' },
  titleBlock: { alignItems: 'center', paddingTop: ShelfieSpacing.sm },
  bookTitle: { fontSize: 30, lineHeight: 34, textAlign: 'center' },
  author: { marginTop: ShelfieSpacing.xxs },
  statusRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: ShelfieSpacing.xs, justifyContent: 'center', marginTop: ShelfieSpacing.sm },
  infoCard: { marginTop: ShelfieSpacing.xl, padding: ShelfieSpacing.lg },
  sectionLabel: { letterSpacing: 1.05 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ShelfieSpacing.md, marginTop: ShelfieSpacing.md },
  infoItem: { minWidth: '44%', flex: 1 },
  infoValue: { marginTop: ShelfieSpacing.xxs },
  metadataRow: { borderTopColor: ShelfieColors.divider, borderTopWidth: 1, gap: ShelfieSpacing.xxs, marginTop: ShelfieSpacing.lg, paddingTop: ShelfieSpacing.md },
  metadataValue: { lineHeight: 20 },
  loadingState: { alignItems: 'center', flex: 1, gap: ShelfieSpacing.sm, justifyContent: 'center' },
  errorState: { alignItems: 'center', flex: 1, gap: ShelfieSpacing.md, justifyContent: 'center', paddingHorizontal: ShelfieSpacing.xl },
  errorCopy: { textAlign: 'center' },
  isbnRow: { borderTopColor: ShelfieColors.divider, borderTopWidth: 1, flexDirection: 'row', gap: ShelfieSpacing.sm, marginTop: ShelfieSpacing.lg, paddingTop: ShelfieSpacing.md },
  aboutSection: { paddingHorizontal: ShelfieSpacing.xs, paddingTop: ShelfieSpacing.xl },
  genrePill: { alignSelf: 'flex-start', backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.full, marginTop: ShelfieSpacing.md, paddingHorizontal: ShelfieSpacing.sm, paddingVertical: ShelfieSpacing.xxs },
  genreText: { color: ShelfieColors.body },
  footer: { backgroundColor: ShelfieColors.surface, borderTopColor: ShelfieColors.divider, borderTopWidth: 1, bottom: 0, gap: ShelfieSpacing.xs, left: 0, paddingHorizontal: ShelfieSpacing.lg, paddingTop: ShelfieSpacing.sm, paddingBottom: ShelfieSpacing.md, position: 'absolute', right: 0 },
});

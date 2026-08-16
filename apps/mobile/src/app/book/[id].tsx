import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShelfieButton, ShelfieCard, ShelfieText, StatusBadge, setShelfieTabBarVisible } from '@/components/shelfie';
import { ShelfieColors, ShelfieRadius, ShelfieSpacing } from '@/constants/theme';
import { libraryBooks } from '@/data/library';

function DeviceChrome() {
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
  const book = libraryBooks.find((item) => item.id === bookId) ?? libraryBooks[0];

  useEffect(() => {
    setShelfieTabBarVisible(false);
    return () => setShelfieTabBarVisible(true);
  }, []);

  const goToLibrary = () => {
    setShelfieTabBarVisible(true);
    router.replace('/explore?variant=populated');
  };
  const goToScan = () => {
    setShelfieTabBarVisible(true);
    router.push('/');
  };

  return <View style={styles.screen}><StatusBar style="dark" /><DeviceChrome /><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}><View style={styles.flex}><View style={styles.header}><Pressable accessibilityLabel="Back to library" accessibilityRole="button" onPress={goToLibrary} style={styles.backButton}><SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={19} tintColor={ShelfieColors.primary} weight="regular" /></Pressable><ShelfieText variant="title" style={styles.headerTitle}>Book Details</ShelfieText><View style={styles.headerSpacer} /></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.coverWrap}><BookCover title={book.title} author={book.author} color={book.spineColor} /></View><View style={styles.titleBlock}><ShelfieText variant="display" style={styles.bookTitle}>{book.title}</ShelfieText><ShelfieText variant="body" color="muted" style={styles.author}>{book.author}</ShelfieText><View style={styles.statusRow}><StatusBadge status="matched" label="In your library" /><ShelfieText variant="caption" color="quiet">Added from bookshelf scan</ShelfieText></View></View><ShelfieCard style={styles.infoCard}><ShelfieText variant="badge" color="quiet" style={styles.sectionLabel}>CATALOG INFORMATION</ShelfieText><View style={styles.infoGrid}><InfoItem label="EDITION" value={book.edition} /><InfoItem label="FORMAT" value={book.format} /><InfoItem label="PUBLISHED" value={book.published} /><InfoItem label="LENGTH" value={book.pages} /></View><View style={styles.isbnRow}><ShelfieText variant="badge" color="quiet">ISBN</ShelfieText><ShelfieText variant="caption" color="muted">{book.isbn}</ShelfieText></View></ShelfieCard><View style={styles.aboutSection}><ShelfieText variant="badge" color="quiet" style={styles.sectionLabel}>ABOUT THIS BOOK</ShelfieText><ShelfieText variant="body" color="muted">{book.description}</ShelfieText><View style={styles.genrePill}><ShelfieText variant="caption" style={styles.genreText}>{book.genre}</ShelfieText></View></View></ScrollView><View style={styles.footer}><ShelfieButton size="lg" onPress={goToScan}>Scan Another Book</ShelfieButton><ShelfieButton size="md" variant="secondary" onPress={goToLibrary}>Back to Library</ShelfieButton></View></View></SafeAreaView></View>;
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
  isbnRow: { borderTopColor: ShelfieColors.divider, borderTopWidth: 1, flexDirection: 'row', gap: ShelfieSpacing.sm, marginTop: ShelfieSpacing.lg, paddingTop: ShelfieSpacing.md },
  aboutSection: { paddingHorizontal: ShelfieSpacing.xs, paddingTop: ShelfieSpacing.xl },
  genrePill: { alignSelf: 'flex-start', backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.full, marginTop: ShelfieSpacing.md, paddingHorizontal: ShelfieSpacing.sm, paddingVertical: ShelfieSpacing.xxs },
  genreText: { color: ShelfieColors.body },
  footer: { backgroundColor: ShelfieColors.surface, borderTopColor: ShelfieColors.divider, borderTopWidth: 1, bottom: 0, gap: ShelfieSpacing.xs, left: 0, paddingHorizontal: ShelfieSpacing.lg, paddingTop: ShelfieSpacing.sm, paddingBottom: ShelfieSpacing.md, position: 'absolute', right: 0 },
});

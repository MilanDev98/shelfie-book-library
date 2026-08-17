import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ShelfieCard, ShelfieText, setShelfieTabBarVisible } from '@/components/shelfie';
import { getBookInitial } from '@/components/shelfie/book-initial';
import { ShelfieColors, ShelfieRadius } from '@/constants/theme';
import { getSavedLibrary, type SavedLibraryBook } from '@/lib/shelfie-api';

function DeviceChrome() {
  if (Platform.OS !== 'web') return null;
  return <View style={styles.deviceStatusBar}><ShelfieText variant="label" style={styles.statusTime}>9:41</ShelfieText><View style={styles.dynamicIsland} /><View style={styles.statusIndicators}><View style={styles.signalBars}>{[5, 8, 11, 13].map((height) => <View key={height} style={[styles.signalBar, { height }]} />)}</View><View style={styles.battery}><View style={styles.batteryFill} /></View></View></View>;
}

function SpineThumb({ title, color }: { title: string; color: string }) {
  return <View style={[styles.spineThumb, { backgroundColor: color }]}><ShelfieText variant="badge" style={styles.spineText}>{getBookInitial(title)}</ShelfieText></View>;
}

export default function LibraryScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<SavedLibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSavedLibrary();
      setBooks(response.results);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your library.');
    } finally {
      setLoading(false);
    }
  }, []);
  const visibleBooks = books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()));
  const newestBookId = books[0]?.id;

  useFocusEffect(useCallback(() => {
    setShelfieTabBarVisible(true);
    void loadLibrary();
  }, [loadLibrary]));

  const empty = !loading && !error && books.length === 0;
  const hasBooks = !loading && !error && books.length > 0;
  return <View style={styles.screen}><StatusBar style="dark" /><DeviceChrome /><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}><View style={styles.flex}><View style={styles.top}><View style={styles.titleRow}><ShelfieText variant="display">My Library</ShelfieText><ShelfieText variant="caption" color="quiet">{loading ? 'Loading…' : `${books.length} ${books.length === 1 ? 'book' : 'books'}`}</ShelfieText></View>{hasBooks ? <View style={styles.searchBox}><SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={ShelfieColors.quiet} weight="regular" /><TextInput accessibilityLabel="Search your library" value={query} onChangeText={setQuery} placeholder="Search your library" placeholderTextColor={ShelfieColors.quiet} style={styles.searchInput} /></View> : null}</View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{loading ? <View accessibilityLiveRegion="polite" style={styles.loadingState}><ActivityIndicator color={ShelfieColors.primary} size="large" /><ShelfieText variant="body" color="muted">Loading your books…</ShelfieText></View> : error ? <EmptyState title="Could not load your library" description={error} icon={<SymbolView name={{ ios: 'exclamationmark.triangle', android: 'error_outline', web: 'error_outline' }} size={28} tintColor={ShelfieColors.quiet} weight="regular" />} actionLabel="Try again" onAction={() => void loadLibrary()} style={styles.emptyState} titleVariant="display" descriptionVariant="body" /> : empty ? <EmptyState title="Your personal library is empty" description="The catalog is ready for matching. Scan a bookshelf, review the results, then confirm the books you want to save here." icon={<SymbolView name={{ ios: 'books.vertical', android: 'menu_book', web: 'menu_book' }} size={28} tintColor={ShelfieColors.quiet} weight="regular" />} actionLabel="Scan Bookshelf" onAction={() => router.push('/')} style={styles.emptyState} titleVariant="display" descriptionVariant="body" /> : visibleBooks.map((book, index) => <Pressable key={book.id} accessibilityLabel={`Open details for ${book.title}`} accessibilityRole="button" onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.catalog_id } })} style={({ pressed }) => [styles.bookPressable, pressed && styles.bookPressed]}><ShelfieCard style={styles.bookRow}><SpineThumb title={book.title} color={index % 2 === 0 ? '#2F5E58' : '#7E4A3A'} /><View style={styles.bookCopy}><ShelfieText variant="bodyStrong" numberOfLines={1}>{book.title}</ShelfieText><ShelfieText variant="caption" color="muted">{book.author}</ShelfieText></View>{book.id === newestBookId ? <View style={styles.newBadge}><ShelfieText variant="badge" style={styles.newText}>NEW</ShelfieText></View> : null}</ShelfieCard></Pressable>)}{hasBooks && visibleBooks.length === 0 ? <ShelfieText variant="body" color="muted" style={styles.noResults}>No books match that search.</ShelfieText> : null}</ScrollView></View></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: ShelfieColors.paper, flex: 1 }, safeArea: { alignItems: 'center', flex: 1, width: '100%' }, flex: { flex: 1, maxWidth: 520, width: '100%' }, deviceStatusBar: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between', paddingHorizontal: 26, position: 'relative', width: '100%' }, statusTime: { color: ShelfieColors.ink, fontSize: 15, fontWeight: '600', lineHeight: 15 }, dynamicIsland: { backgroundColor: '#12100E', borderRadius: ShelfieRadius.full, height: 28, left: '50%', position: 'absolute', top: 11, transform: [{ translateX: -52 }], width: 104 }, statusIndicators: { alignItems: 'flex-end', flexDirection: 'row', gap: 6 }, signalBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 2 }, signalBar: { backgroundColor: ShelfieColors.ink, borderRadius: 1, width: 3 }, battery: { borderColor: ShelfieColors.ink, borderRadius: 4, borderWidth: 1.5, height: 12, padding: 1.5, width: 24 }, batteryFill: { backgroundColor: ShelfieColors.ink, borderRadius: 2, height: '100%', width: '70%' },
  top: { paddingHorizontal: 20, paddingTop: 6 }, titleRow: { alignItems: 'baseline', flexDirection: 'row', gap: 10 }, searchBox: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderColor: ShelfieColors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, height: 48, marginTop: 14, paddingHorizontal: 14 }, searchInput: { color: ShelfieColors.ink, flex: 1, fontFamily: 'DMSans', fontSize: 15 }, content: { alignSelf: 'center', paddingBottom: 26, paddingHorizontal: 20, paddingTop: 16, width: '100%' }, bookPressable: { borderRadius: ShelfieRadius.lg, marginBottom: 8 }, bookPressed: { opacity: 0.78 }, bookRow: { alignItems: 'center', flexDirection: 'row', gap: 13, marginBottom: 0, padding: 11 }, spineThumb: { alignItems: 'center', borderRadius: 5, height: 48, justifyContent: 'center', overflow: 'hidden', width: 34 }, spineText: { color: 'rgba(255,255,255,0.82)', fontSize: 20, lineHeight: 24, textAlign: 'center' }, bookCopy: { flex: 1, minWidth: 0 }, newBadge: { backgroundColor: ShelfieColors.matchedTint, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 }, newText: { color: ShelfieColors.matched }, emptyState: { marginTop: 68 }, loadingState: { alignItems: 'center', gap: 14, paddingTop: 48 }, noResults: { paddingTop: 40, textAlign: 'center' },
});

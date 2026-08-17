import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ImageUploadPreview,
  ReviewCard,
  ShelfieButton,
  ShelfieCard,
  ShelfieProcessingState,
  ShelfieText,
  StatusBadge,
  OutcomeState,
  setShelfieTabBarVisible,
} from '@/components/shelfie';
import { ShelfieBottomBarHeight, ShelfieColors, ShelfieRadius, ShelfieSpacing } from '@/constants/theme';
import {
  analyzeShelfPhoto,
  getSavedLibrary,
  saveConfirmedBooks,
  searchCatalog,
  ShelfieApiError,
  type AnalyzedBook,
  type CatalogCandidate,
  type SavedLibraryBook,
} from '@/lib/shelfie-api';
import { getBookInitial } from '@/components/shelfie/book-initial';

const tips = ['Keep book spines visible', 'Avoid glare and shadows', 'Try to keep the camera straight'];
type ScanState = 'home' | 'capture' | 'processing' | 'results' | 'review' | 'search' | 'nobooks' | 'nomatch' | 'unreadable' | 'error' | 'timeout';
type ScanBook = { id: string; catalogId?: string; catalogCandidates?: CatalogCandidate[]; title: string; author: string; detectedTitle: string; detectedAuthor: string; confidence: number; status: 'matched' | 'saved' | 'pending' | 'no-match' | 'unreadable'; spineColor: string };

const spineColors = ['#7E4A3A', '#B27B3C', '#74634F', '#7C6250', '#2F5E58', '#B6A36B'];

function toReviewBook(book: AnalyzedBook, index: number): ScanBook {
  const matched = book.catalog.status === 'matched' && book.catalog.match;
  const suggested = book.catalog.match ?? book.catalog.candidates[0];
  const readable = book.readable && Boolean(book.title);
  const confidence = suggested?.score != null
    ? Math.round(suggested.score * 100)
    : matched
      ? 96
      : book.catalog.status === 'not_sure'
        ? 68
        : 0;
  return {
    id: String(book.id),
    catalogId: suggested?.catalog_id,
    catalogCandidates: book.catalog.match ? [book.catalog.match, ...book.catalog.candidates] : book.catalog.candidates,
    title: suggested?.title ?? book.title ?? 'Unreadable book',
    author: suggested?.author ?? book.author ?? 'Author not identified',
    detectedTitle: book.title ?? 'Unreadable',
    detectedAuthor: book.author ?? 'Author not identified',
    confidence,
    status: !readable ? 'unreadable' : matched ? 'matched' : book.catalog.status === 'not_sure' ? 'pending' : 'no-match',
    spineColor: spineColors[index % spineColors.length],
  };
}

function DeviceChrome() {
  if (Platform.OS !== 'web') return null;
  return <View style={styles.deviceStatusBar}>
    <ShelfieText variant="label" style={styles.statusTime}>9:41</ShelfieText><View style={styles.dynamicIsland} />
    <View style={styles.statusIndicators}><View style={styles.signalBars}>{[styles.signalBarOne, styles.signalBarTwo, styles.signalBarThree, styles.signalBarFour].map((bar) => <View key={bar.height} style={[styles.signalBar, bar]} />)}</View><View style={styles.battery}><View style={styles.batteryFill} /></View></View>
  </View>;
}

function Header({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: ReactNode }) {
  return <View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}><SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={ShelfieColors.primary} weight="regular" /></Pressable><ShelfieText variant="title" style={styles.headerTitle}>{title}</ShelfieText>{trailing ?? <View style={styles.headerSpacer} />}</View>;
}

function Footer({ children }: { children: ReactNode }) { return <View style={styles.footer}>{children}</View>; }
function SectionLabel({ children, tone = 'muted' }: { children: string; tone?: 'muted' | 'green' | 'amber' }) {
  return <View style={styles.sectionLabelRow}><ShelfieText variant="badge" color={tone === 'green' ? 'primary' : tone === 'amber' ? 'review' : 'quiet'} style={styles.sectionLabel}>{children}</ShelfieText><View style={[styles.sectionRule, tone === 'green' && styles.greenRule, tone === 'amber' && styles.amberRule]} /></View>;
}
function SpineBook({ book, compact = false }: { book: ScanBook; compact?: boolean }) { return <View style={[styles.spineBook, compact && styles.compactSpineBook, { backgroundColor: book.spineColor }]}><ShelfieText variant="badge" style={styles.spineText}>{getBookInitial(book.title)}</ShelfieText></View>; }
function ReviewListCard({ book, onPress }: { book: ScanBook; onPress: () => void }) { return <ReviewCard book={book} onPress={onPress} showDetectedText={false} style={styles.reviewListCard} />; }
function SavedBookPreview({ book, onPress }: { book: SavedLibraryBook; onPress: () => void }) {
  return <Pressable accessibilityLabel={`Open details for ${book.title}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.savedBookPressable, pressed && styles.savedBookPressed]}>
    <ShelfieCard style={styles.savedBookCard}>
      <View style={styles.savedBookInitial}><ShelfieText variant="badge" style={styles.savedBookInitialText}>{getBookInitial(book.title)}</ShelfieText></View>
      <View style={styles.savedBookCopy}><ShelfieText variant="bodyStrong" numberOfLines={1}>{book.title}</ShelfieText><ShelfieText variant="caption" color="muted" numberOfLines={1}>{book.author}</ShelfieText></View>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={ShelfieColors.quiet} weight="regular" />
    </ShelfieCard>
  </Pressable>;
}
export default function ScanHomeScreen() {
  const router = useRouter();
  const analysisRequestRef = useRef<AbortController | null>(null);
  const [screen, setScreen] = useState<ScanState>('home');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [scanBooks, setScanBooks] = useState<ScanBook[] | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [automaticSaveError, setAutomaticSaveError] = useState<string | null>(null);
  const [isRetryingAutomaticSave, setIsRetryingAutomaticSave] = useState(false);
  const [isConfirmingReview, setIsConfirmingReview] = useState(false);
  const [reviewSaveError, setReviewSaveError] = useState<string | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [query, setQuery] = useState('midnight library');
  const [catalogResults, setCatalogResults] = useState<CatalogCandidate[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const [analysisTruncated, setAnalysisTruncated] = useState(false);
  const [homeLibraryBooks, setHomeLibraryBooks] = useState<SavedLibraryBook[]>([]);
  const [homeLibraryLoading, setHomeLibraryLoading] = useState(true);
  const [homeLibraryError, setHomeLibraryError] = useState<string | null>(null);
  const loadHomeLibrary = useCallback(async (signal?: AbortSignal) => {
    setHomeLibraryLoading(true);
    setHomeLibraryError(null);
    try {
      const response = await getSavedLibrary(signal);
      setHomeLibraryBooks(response.results);
    } catch (error) {
      if (error instanceof ShelfieApiError && error.code === 'request_canceled') return;
      setHomeLibraryError(error instanceof Error ? error.message : 'Could not load your library.');
    } finally {
      if (!signal?.aborted) setHomeLibraryLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    if (screen !== 'home') return;
    const controller = new AbortController();
    void loadHomeLibrary(controller.signal);
    return () => controller.abort();
  }, [loadHomeLibrary, screen]));
  useEffect(() => {
    setShelfieTabBarVisible(screen === 'home');
    return () => setShelfieTabBarVisible(true);
  }, [screen]);
  useEffect(() => {
    if (screen !== 'processing') return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setAnalysisElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);
  useEffect(() => () => analysisRequestRef.current?.abort(), []);
  const books = scanBooks ?? [];
  const reviewBooks = books.filter((book) => book.status === 'pending');
  const currentReview = books.find((book) => book.id === activeBookId) ?? reviewBooks[reviewIndex] ?? reviewBooks[0];
  const analysisStep = analysisElapsedSeconds < 3 ? 0 : analysisElapsedSeconds < 18 ? 1 : 2;
  const resetHome = () => { setScreen('home'); setHasPhoto(false); setPhotoUri(null); setPhotoAsset(null); setScanBooks(null); setRequestError(null); setAutomaticSaveError(null); setActiveBookId(null); setAnalysisTruncated(false); };
  const goHome = () => { analysisRequestRef.current?.abort(); resetHome(); };
  const selectPhoto = async (source: 'camera' | 'library') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        throw new Error(source === 'camera'
          ? 'Camera access is needed to take a bookshelf photo. Enable it in your device settings and try again.'
          : 'Photo library access is needed to choose a bookshelf photo. Enable it in your device settings and try again.');
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.back, mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
            quality: 0.9,
          });
      const asset = result.canceled ? null : result.assets[0];
      if (asset) {
        setPhotoAsset(asset);
        setPhotoUri(asset.uri);
        setHasPhoto(true);
        setRequestError(null);
        setScreen('capture');
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not open your photo library.');
      setScreen('error');
    }
  };
  const openPhoto = () => void selectPhoto('library');
  const openCapture = () => { setHasPhoto(false); setPhotoUri(null); setPhotoAsset(null); setScreen('capture'); };
  const openProcessing = async () => {
    if (!photoUri) {
      setRequestError('Choose a shelf photo before starting analysis.');
      setScreen('capture');
      return;
    }
    analysisRequestRef.current?.abort();
    const controller = new AbortController();
    analysisRequestRef.current = controller;
    setRequestError(null);
    setAutomaticSaveError(null);
    setAnalysisElapsedSeconds(0);
    setScreen('processing');
    try {
      const response = await analyzeShelfPhoto({
        uri: photoUri,
        file: photoAsset?.file ?? undefined,
        fileName: photoAsset?.fileName,
        mimeType: photoAsset?.mimeType,
      }, controller.signal);
      const nextBooks = response.books.map(toReviewBook);
      const confidentCatalogIds = nextBooks
        .filter((book) => book.status === 'matched' && book.catalogId)
        .map((book) => book.catalogId!);
      let finalizedBooks = nextBooks;

      if (confidentCatalogIds.length > 0) {
        try {
          await saveConfirmedBooks(confidentCatalogIds);
          finalizedBooks = nextBooks.map((book) => book.status === 'matched'
            ? { ...book, status: 'saved' as const }
            : book);
        } catch (saveError) {
          setAutomaticSaveError(saveError instanceof Error
            ? saveError.message
            : 'The confident matches were found, but could not be saved automatically.');
        }
      }

      setScanBooks(finalizedBooks);
      setAnalysisTruncated(response.truncated);
      setReviewIndex(0);
      const onlyOutcome = finalizedBooks.length === 1 && (finalizedBooks[0].status === 'no-match' || finalizedBooks[0].status === 'unreadable');
      setActiveBookId(onlyOutcome ? finalizedBooks[0].id : null);
      setScreen(finalizedBooks.length === 0 ? 'nobooks' : onlyOutcome ? finalizedBooks[0].status === 'no-match' ? 'nomatch' : 'unreadable' : 'results');
    } catch (error) {
      if (controller.signal.aborted) return;
      setRequestError(error instanceof Error ? error.message : 'Could not analyze this shelf photo.');
      setScreen(error instanceof ShelfieApiError && (error.code === 'request_timeout' || error.code === 'vision_provider_timeout') ? 'timeout' : 'error');
    } finally {
      if (analysisRequestRef.current === controller) analysisRequestRef.current = null;
    }
  };
  const confirmReviewBook = async () => {
    if (!currentReview?.catalogId || isConfirmingReview) {
      setReviewSaveError('Choose a catalog match before confirming this book.');
      return;
    }

    const confirmedBook = currentReview;
    const confirmedCatalogId = currentReview.catalogId;
    const remainingReviewBooks = reviewBooks.filter((book) => book.id !== confirmedBook.id);
    setIsConfirmingReview(true);
    setReviewSaveError(null);

    try {
      await saveConfirmedBooks([confirmedCatalogId]);
      setScanBooks((existing) => existing?.map((book) => book.id === confirmedBook.id
        ? { ...book, status: 'saved' }
        : book) ?? null);
      setReviewIndex(0);

      if (remainingReviewBooks.length > 0) {
        setActiveBookId(remainingReviewBooks[0].id);
      } else {
        setActiveBookId(null);
        setScreen('results');
      }
    } catch (error) {
      setReviewSaveError(error instanceof Error ? error.message : 'Could not add this book to your library.');
    } finally {
      setIsConfirmingReview(false);
    }
  };
  const retryAutomaticSave = async () => {
    const pendingSaveIds = books
      .filter((book) => book.status === 'matched' && book.catalogId)
      .map((book) => book.catalogId!);
    if (pendingSaveIds.length === 0 || isRetryingAutomaticSave) return;
    setIsRetryingAutomaticSave(true);
    setAutomaticSaveError(null);
    try {
      await saveConfirmedBooks(pendingSaveIds);
      setScanBooks((existing) => existing?.map((book) => book.catalogId && pendingSaveIds.includes(book.catalogId)
        ? { ...book, status: 'saved' }
        : book) ?? null);
    } catch (error) {
      setAutomaticSaveError(error instanceof Error ? error.message : 'Could not save the confident matches automatically.');
    } finally {
      setIsRetryingAutomaticSave(false);
    }
  };
  const selectCatalogCandidate = (candidate: CatalogCandidate) => {
    if (!currentReview || !scanBooks) return;
    setScanBooks((existing) => existing?.map((book) => book.id === currentReview.id ? {
      ...book,
      catalogId: candidate.catalog_id,
      title: candidate.title,
      author: candidate.author,
      status: 'pending',
      confidence: candidate.score != null ? Math.round(candidate.score * 100) : book.confidence,
    } : book) ?? null);
    setCatalogResults((existing) => existing.length ? existing : [candidate]);
  };
  const openCatalogCorrection = () => {
    if (!currentReview) return;
    setQuery(currentReview.detectedTitle === 'Unreadable' ? '' : currentReview.detectedTitle);
    setCatalogResults(currentReview.catalogCandidates ?? []);
    setCatalogError(null);
    setScreen('search');
  };
  const discardBook = (bookId: string) => {
    setScanBooks((existing) => existing?.filter((book) => book.id !== bookId) ?? null);
    setActiveBookId(null);
    setReviewSaveError(null);
    setReviewIndex(0);
    setScreen('results');
  };

  useEffect(() => {
    if (screen !== 'search' || !currentReview) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setCatalogLoading(true);
      setCatalogError(null);
      void searchCatalog(query).then((response) => {
        if (!cancelled) setCatalogResults(response.results);
      }).catch((caught) => {
        if (!cancelled) setCatalogError(caught instanceof Error ? caught.message : 'Could not search the catalog.');
      }).finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentReview, query, screen]);

  const renderHome = () => <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.homeScroll}>
    <View><ShelfieText variant="display">Shelfie</ShelfieText><ShelfieText variant="body" color="muted" style={styles.subtitle}>Turn your bookshelf into a personal library.</ShelfieText></View>
    <ShelfieCard tone="tinted" style={styles.explainer}><View style={styles.infoIcon}><SymbolView name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }} size={19} tintColor={ShelfieColors.onPrimary} weight="regular" /></View><ShelfieText variant="body" style={styles.explainerCopy}>Take a photo of your bookshelf and Shelfie will identify the books for you.</ShelfieText></ShelfieCard>
    <View style={styles.actions}><ShelfieButton size="lg" accessibilityLabel="Scan your bookshelf" onPress={openCapture}><View style={styles.buttonContent}><SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'camera' }} size={20} tintColor={ShelfieColors.onPrimary} weight="regular" /><ShelfieText variant="button" style={styles.primaryButtonText}>Scan Bookshelf</ShelfieText></View></ShelfieButton><ShelfieButton size="lg" variant="secondary" accessibilityLabel="Choose a bookshelf photo" onPress={openPhoto}><View style={styles.buttonContent}><SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={20} tintColor={ShelfieColors.primary} weight="regular" /><ShelfieText variant="button" style={styles.secondaryButtonText}>Choose Photo</ShelfieText></View></ShelfieButton></View>
    <View style={styles.tips}><ShelfieText variant="badge" color="quiet" style={styles.tipsHeading}>For better results</ShelfieText><View style={styles.tipList}>{tips.map((tip) => <View key={tip} style={styles.tipRow}><View style={styles.tipDot} /><ShelfieText variant="label">{tip}</ShelfieText></View>)}</View></View>
    <View style={styles.homeLibrary}>
      <View style={styles.homeLibraryHeading}><View style={styles.homeLibraryTitle}><ShelfieText variant="title">Your Library</ShelfieText>{!homeLibraryLoading && !homeLibraryError ? <ShelfieText variant="caption" color="quiet">{homeLibraryBooks.length} {homeLibraryBooks.length === 1 ? 'book' : 'books'}</ShelfieText> : null}</View>{homeLibraryBooks.length > 0 ? <Pressable accessibilityRole="button" onPress={() => router.push('/explore')}><ShelfieText variant="label" color="primary">View all</ShelfieText></Pressable> : null}</View>
      {homeLibraryLoading
        ? <ShelfieCard style={styles.homeLibraryState}><ActivityIndicator color={ShelfieColors.primary} /><ShelfieText accessibilityLiveRegion="polite" variant="caption" color="muted">Loading your books…</ShelfieText></ShelfieCard>
        : homeLibraryError
          ? <ShelfieCard style={styles.homeLibraryState}><ShelfieText variant="caption" color="muted" style={styles.homeLibraryError}>{homeLibraryError}</ShelfieText><ShelfieButton size="sm" variant="secondary" onPress={() => void loadHomeLibrary()}>Try Again</ShelfieButton></ShelfieCard>
          : homeLibraryBooks.length > 0
            ? <>{homeLibraryBooks.slice(0, 3).map((book) => <SavedBookPreview key={book.id} book={book} onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.catalog_id } })} />)}</>
            : <EmptyState description="Scan your first bookshelf to get started." icon={<SymbolView name={{ ios: 'books.vertical', android: 'menu_book', web: 'menu_book' }} size={22} tintColor={ShelfieColors.quiet} weight="regular" />} style={styles.emptyLibrary} titleVariant="emptyTitle" descriptionVariant="emptyDescription" title="Your library is empty." />}
    </View>
  </ScrollView>;

  const renderCapture = () => <View style={styles.flexScreen}><Header title="Add Bookshelf Photo" onBack={goHome} /><ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}><ImageUploadPreview imageUri={photoUri} onTakePhoto={photoUri ? () => void openProcessing() : () => void selectPhoto('camera')} onChoosePhoto={openPhoto} onRemove={() => { setPhotoUri(null); setPhotoAsset(null); setHasPhoto(false); }} title="Take a bookshelf photo" description="Frame one shelf at a time for the best results." /><ShelfieText variant="body" color="muted" style={styles.paragraph}>{hasPhoto ? "We'll detect the book spines, read the visible titles and authors, and match them to the catalog." : 'Choose a photo or use your camera to begin.'}</ShelfieText></ScrollView></View>;

  const renderProcessing = () => <View style={styles.flexScreen}><ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}><View style={styles.photoSummary}>{photoUri ? <Image accessibilityLabel="Bookshelf photo being analyzed" contentFit="cover" source={{ uri: photoUri }} style={styles.processingPhoto} /> : <View style={styles.photoSummaryFallback}><SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={22} tintColor={ShelfieColors.quiet} weight="regular" /></View>}<View style={styles.photoSummaryCopy}><ShelfieText variant="badge" color="subtle">YOUR PHOTO</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.summaryText}>Uploaded to Django; only detected spine crops are sent to OpenRouter.</ShelfieText></View></View><ShelfieText variant="display" style={styles.analysisTitle}>Analyzing your bookshelf</ShelfieText><ShelfieText accessibilityLiveRegion="polite" variant="body" color="muted">Scan is still working · {analysisElapsedSeconds}s elapsed</ShelfieText><ShelfieProcessingState activeStep={analysisStep} description="The detector, OpenRouter reading, catalog matching, and confident-match saving run in one flow." style={styles.processingCard} title="Analysis in progress" /><View style={styles.infoNote}><ShelfieText variant="caption" color="quiet">ⓘ  Keep this screen open. Confident matches are added automatically; uncertain books stay pending for your review.</ShelfieText></View></ScrollView><Footer><ShelfieButton variant="ghost" size="sm" onPress={goHome}>Cancel Analysis</ShelfieButton></Footer></View>;

  const renderResults = () => {
    const matchedBooks = books.filter((book) => book.status === 'matched');
    const savedBooks = books.filter((book) => book.status === 'saved');
    const attentionBooks = books.filter((book) => book.status === 'no-match' || book.status === 'unreadable');
    return <View style={styles.flexScreen}>
      <Header title="Books Found" onBack={goHome} />
      <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
        <ShelfieCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {photoUri ? <Image accessibilityLabel="Analyzed bookshelf photo" contentFit="cover" source={{ uri: photoUri }} style={styles.processingPhoto} /> : <View style={styles.photoSummaryFallback}><SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={22} tintColor={ShelfieColors.quiet} weight="regular" /></View>}
            <View>
              <ShelfieText variant="title">{books.length} books found</ShelfieText>
              <ShelfieText variant="caption" color="quiet" style={styles.summaryText}>From one bookshelf photo</ShelfieText>
            </View>
          </View>
          <View style={styles.divider} />
          <ShelfieText variant="body">●  {savedBooks.length} added  ·  <ShelfieText style={styles.reviewCopy}>●  {reviewBooks.length} pending review</ShelfieText></ShelfieText>
        </ShelfieCard>
        {analysisTruncated ? <ShelfieCard tone="tinted" style={styles.truncatedNotice}><ShelfieText variant="bodyStrong">Large shelf photo</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.summaryText}>For predictable response time, this scan processed the 12 strongest spine detections. Scan one shelf at a time to capture any remaining books.</ShelfieText></ShelfieCard> : null}
        {reviewBooks.length ? <View style={styles.section}>
          <SectionLabel tone="amber">Pending Review</SectionLabel>
          <ShelfieText variant="caption" color="quiet" style={styles.sectionHint}>Uncertain matches are never added until you confirm or correct them.</ShelfieText>
          {reviewBooks.map((book) => <ReviewListCard key={book.id} book={book} onPress={() => { setReviewSaveError(null); setReviewIndex(reviewBooks.indexOf(book)); setActiveBookId(book.id); setScreen('review'); }} />)}
        </View> : null}
        {attentionBooks.length ? <View style={styles.section}>
          <SectionLabel tone="amber">Needs Attention</SectionLabel>
          {attentionBooks.map((book) => <ReviewListCard key={book.id} book={book} onPress={() => { setActiveBookId(book.id); setScreen(book.status === 'no-match' ? 'nomatch' : 'unreadable'); }} />)}
        </View> : null}
        {savedBooks.length ? <View style={styles.section}>
          <SectionLabel tone="green">Added to Library</SectionLabel>
          <ShelfieText variant="caption" color="quiet" style={styles.sectionHint}>Confident matches were added automatically. Reviewed matches appear here after confirmation.</ShelfieText>
          {savedBooks.map((book) => <ReviewCard key={book.id} book={book} showDetectedText={false} style={styles.reviewListCard} />)}
        </View> : null}
        {matchedBooks.length ? <View style={styles.section}>
          <SectionLabel tone="amber">Save Pending</SectionLabel>
          <ShelfieText accessibilityLiveRegion="polite" variant="caption" color="muted" style={styles.sectionHint}>{automaticSaveError ?? 'Shelfie found confident matches but still needs to finish saving them.'}</ShelfieText>
          {matchedBooks.map((book) => <ReviewCard key={book.id} book={book} showDetectedText={false} style={styles.reviewListCard} />)}
        </View> : null}
      </ScrollView>
      <Footer>
        {reviewBooks.length ? <ShelfieButton size="lg" onPress={() => { setReviewSaveError(null); setReviewIndex(0); setActiveBookId(reviewBooks[0].id); setScreen('review'); }}>{`Review ${reviewBooks.length} Books`}</ShelfieButton> : null}
        {matchedBooks.length > 0
          ? <ShelfieButton disabled={isRetryingAutomaticSave} loading={isRetryingAutomaticSave} size="md" variant="secondary" onPress={() => void retryAutomaticSave()}>{`Retry Saving ${matchedBooks.length} ${matchedBooks.length === 1 ? 'Book' : 'Books'}`}</ShelfieButton>
          : savedBooks.length > 0
            ? <ShelfieButton size="md" variant="secondary" onPress={() => router.push('/explore')}>View Library</ShelfieButton>
            : null}
      </Footer>
    </View>;
  };

  const renderReview = () => <View style={styles.flexScreen}>
    <Header title="Review Book" onBack={() => setScreen('results')} trailing={<ShelfieText variant="caption" color="quiet" style={styles.progressPill}>{reviewIndex + 1} of {reviewBooks.length}</ShelfieText>} />
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((reviewIndex + 1) / reviewBooks.length) * 100}%` }]} /></View>
    <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
      <View style={styles.reviewPhotoCard}>{photoUri ? <Image accessibilityLabel="Selected bookshelf photo for this review" contentFit="cover" source={{ uri: photoUri }} style={styles.reviewPhoto} /> : <View style={styles.reviewPhotoFallback}><SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={26} tintColor={ShelfieColors.quiet} weight="regular" /></View>}<View style={styles.reviewPhotoCopy}><ShelfieText variant="badge" color="quiet">SELECTED SHELF PHOTO</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.summaryText}>Reviewing detection {currentReview.id}. Use the detected text and catalog candidates below.</ShelfieText></View></View>
      <ShelfieText variant="badge" color="quiet" style={styles.formLabel}>DETECTED</ShelfieText>
      <ShelfieCard tone="tinted" style={styles.detectedCard}><ShelfieText variant="bodyStrong">“{currentReview.detectedTitle}”</ShelfieText><ShelfieText variant="body" color="quiet">“{currentReview.detectedAuthor}”</ShelfieText></ShelfieCard>
      <ShelfieText variant="badge" color="quiet" style={styles.formLabel}>SUGGESTED MATCH</ShelfieText>
      <ShelfieCard style={styles.suggestedCard}>
        <ShelfieText variant="display" style={styles.suggestedTitle}>{currentReview.title}</ShelfieText>
        <ShelfieText variant="body" color="muted">{currentReview.author}</ShelfieText>
        <View style={styles.confidenceDivider} />
        <View style={styles.confidenceRow}><ShelfieText variant="caption" color="quiet">Confidence</ShelfieText><View style={styles.confidenceBadges}><StatusBadge status="pending" /><ShelfieText variant="bodyStrong" style={styles.confidenceValue}>{currentReview.confidence}%</ShelfieText></View></View>
        <View style={styles.confidenceMeter}><View style={[styles.confidenceFill, { width: `${currentReview.confidence}%` }]} /></View>
      </ShelfieCard>
    </ScrollView>
    <Footer>
      <ShelfieButton loading={isConfirmingReview} size="lg" onPress={() => void confirmReviewBook()}>✓  Confirm & Add to Library</ShelfieButton>
      {reviewSaveError ? <ShelfieText accessibilityLiveRegion="polite" variant="caption" style={styles.reviewError}>{reviewSaveError}</ShelfieText> : null}
      <View style={styles.reviewActionRow}><ShelfieButton disabled={isConfirmingReview} size="sm" variant="secondary" style={styles.reviewCorrectButton} onPress={openCatalogCorrection}>Correct Match</ShelfieButton><ShelfieButton disabled={isConfirmingReview} size="sm" variant="destructive" style={styles.reviewDiscardButton} onPress={() => discardBook(currentReview.id)}>Discard</ShelfieButton></View>
      <ShelfieText variant="caption" color="quiet" style={styles.reviewFooterNote}>Confirm saves this book to your library now. Choose Correct Match to search the catalog manually.</ShelfieText>
    </Footer>
  </View>;

  const renderSearch = () => <View style={styles.flexScreen}><Header title="Find the Correct Book" onBack={() => setScreen(currentReview.status === 'pending' ? 'review' : currentReview.status === 'no-match' ? 'nomatch' : 'unreadable')} /><ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}><View style={styles.detectedSummary}><SpineBook book={currentReview} compact /><View><ShelfieText variant="badge" color="quiet">DETECTED</ShelfieText><ShelfieText variant="bodyStrong" style={styles.searchDetected}>{currentReview.detectedTitle}</ShelfieText></View></View><View style={styles.searchBox}><SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={ShelfieColors.quiet} weight="regular" /><TextInput accessibilityLabel="Search catalog" value={query} onChangeText={setQuery} placeholder="Search title or author" placeholderTextColor={ShelfieColors.quiet} style={styles.searchInput} /></View>{catalogLoading ? <ShelfieText variant="caption" color="quiet" style={styles.resultsCount}>Searching catalog…</ShelfieText> : catalogError ? <ShelfieText variant="caption" color="quiet" style={styles.resultsCount}>{catalogError}</ShelfieText> : <ShelfieText variant="caption" color="quiet" style={styles.resultsCount}>{catalogResults.length} results</ShelfieText>}<ShelfieText variant="badge" color="quiet" style={styles.formLabel}>CATALOG RESULTS</ShelfieText>{catalogResults.map((book) => { const selected = currentReview.catalogId === book.catalog_id; return <Pressable key={book.catalog_id} onPress={() => selectCatalogCandidate(book)} style={[styles.catalogResult, selected && styles.catalogSelected]}><View style={styles.catalogCopy}><ShelfieText variant="bodyStrong">{book.title}</ShelfieText><ShelfieText variant="caption" color="muted">{book.author}</ShelfieText><ShelfieText variant="caption" color="quiet" style={styles.edition}>{book.edition || 'Catalog edition'}</ShelfieText></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <ShelfieText style={styles.radioCheck}>✓</ShelfieText> : null}</View></Pressable>; })}{!catalogLoading && !catalogError && catalogResults.length === 0 ? <ShelfieCard tone="tinted" style={styles.noCatalogMatch}><ShelfieText variant="bodyStrong">No catalog match found</ShelfieText><ShelfieText variant="caption" color="muted" style={styles.summaryText}>Try another title or author. If this book is outside the provided catalog, discard it from this scan.</ShelfieText></ShelfieCard> : null}</ScrollView><Footer><ShelfieButton disabled={!currentReview.catalogId} size="lg" onPress={() => setScreen('review')}>Use This Book</ShelfieButton><ShelfieButton size="sm" variant="destructive" onPress={() => discardBook(currentReview.id)}>Discard Book</ShelfieButton></Footer></View>;

  const renderOutcome = () => <OutcomeState state={screen as 'nobooks' | 'nomatch' | 'unreadable' | 'error' | 'timeout'} book={currentReview} photoUri={photoUri} errorMessage={requestError} onBack={resetHome} onChoosePhoto={openPhoto} onCorrect={openCatalogCorrection} onDiscard={() => currentReview ? discardBook(currentReview.id) : resetHome()} onRetry={screen === 'timeout' || screen === 'error' ? openProcessing : openCapture} />;

  const body = screen === 'home' ? renderHome() : screen === 'capture' ? renderCapture() : screen === 'processing' ? renderProcessing() : screen === 'results' ? renderResults() : screen === 'review' ? renderReview() : screen === 'search' ? renderSearch() : renderOutcome();
  return <View style={[styles.screen, screen !== 'home' && styles.overlayScreen]}><StatusBar style="dark" /><DeviceChrome /><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>{body}</SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: ShelfieColors.paper, flex: 1 }, overlayScreen: { bottom: 0, elevation: 10, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 }, safeArea: { alignItems: 'center', flex: 1, width: '100%' }, homeScroll: { width: '100%' },
  deviceStatusBar: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between', paddingHorizontal: 26, position: 'relative', width: '100%' }, statusTime: { color: ShelfieColors.ink, fontSize: 15, fontWeight: '600', lineHeight: 15 }, dynamicIsland: { backgroundColor: '#12100E', borderRadius: ShelfieRadius.full, height: 28, left: '50%', position: 'absolute', top: 11, transform: [{ translateX: -52 }], width: 104 }, statusIndicators: { alignItems: 'flex-end', flexDirection: 'row', gap: 6 }, signalBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 2 }, signalBar: { backgroundColor: ShelfieColors.ink, borderRadius: 1, width: 3 }, signalBarOne: { height: 5 }, signalBarTwo: { height: 8 }, signalBarThree: { height: 11 }, signalBarFour: { height: 13 }, battery: { borderColor: ShelfieColors.ink, borderRadius: 4, borderWidth: 1.5, height: 12, padding: 1.5, width: 24 }, batteryFill: { backgroundColor: ShelfieColors.ink, borderRadius: 2, height: '100%', width: '70%' },
  content: { alignSelf: 'center', maxWidth: 520, paddingBottom: ShelfieBottomBarHeight, paddingHorizontal: ShelfieSpacing.md, paddingTop: ShelfieSpacing.xxs, width: '100%' }, innerContent: { alignSelf: 'center', maxWidth: 520, paddingBottom: 22, paddingHorizontal: ShelfieSpacing.lg, paddingTop: 4, width: '100%' }, flexScreen: { flex: 1, width: '100%' }, subtitle: { marginTop: 6, maxWidth: 280 }, explainer: { alignItems: 'flex-start', flexDirection: 'row', gap: ShelfieSpacing.sm, marginTop: ShelfieSpacing.md }, infoIcon: { alignItems: 'center', backgroundColor: ShelfieColors.primary, borderRadius: ShelfieRadius.md, flexShrink: 0, height: 36, justifyContent: 'center', width: 36 }, explainerCopy: { flex: 1, paddingTop: ShelfieSpacing.xxs }, buttonContent: { alignItems: 'center', flexDirection: 'row', gap: 10 }, primaryButtonText: { color: ShelfieColors.onPrimary }, secondaryButtonText: { color: ShelfieColors.primary }, actions: { gap: ShelfieSpacing.xs, marginTop: ShelfieSpacing.md }, tips: { marginTop: ShelfieSpacing.xl }, tipsHeading: { letterSpacing: 1.1, textTransform: 'uppercase' }, tipList: { gap: ShelfieSpacing.sm, marginTop: ShelfieSpacing.sm }, tipRow: { alignItems: 'center', flexDirection: 'row', gap: ShelfieSpacing.sm }, tipDot: { backgroundColor: ShelfieColors.border, borderRadius: ShelfieRadius.full, height: ShelfieSpacing.xxs, width: ShelfieSpacing.xxs }, homeLibrary: { gap: ShelfieSpacing.xs, marginTop: ShelfieSpacing.xl }, homeLibraryHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }, homeLibraryTitle: { alignItems: 'baseline', flexDirection: 'row', gap: ShelfieSpacing.xs }, homeLibraryState: { alignItems: 'center', gap: ShelfieSpacing.sm, marginTop: ShelfieSpacing.xxs }, homeLibraryError: { textAlign: 'center' }, savedBookPressable: { borderRadius: ShelfieRadius.lg }, savedBookPressed: { opacity: 0.78 }, savedBookCard: { alignItems: 'center', flexDirection: 'row', gap: ShelfieSpacing.sm, padding: ShelfieSpacing.sm }, savedBookInitial: { alignItems: 'center', backgroundColor: '#2F5E58', borderRadius: 5, height: 48, justifyContent: 'center', width: 34 }, savedBookInitialText: { color: 'rgba(255,255,255,0.82)', fontSize: 20, lineHeight: 24 }, savedBookCopy: { flex: 1, minWidth: 0 }, emptyLibrary: { marginTop: ShelfieSpacing.xs }, truncatedNotice: { marginBottom: 4, marginTop: 12 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingBottom: 12, paddingHorizontal: 20, paddingTop: 4, width: '100%' }, backButton: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderColor: ShelfieColors.border, borderRadius: ShelfieRadius.md, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 }, backArrow: { color: ShelfieColors.primary, fontSize: 29, lineHeight: 30, marginTop: -4 }, headerTitle: { flex: 1 }, headerSpacer: { width: 38 }, progressPill: { backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.sm, paddingHorizontal: 10, paddingVertical: 7 }, footer: { backgroundColor: ShelfieColors.paper, borderTopColor: '#EEE8DC', borderTopWidth: 1, gap: 9, paddingBottom: 26, paddingHorizontal: 20, paddingTop: 13, width: '100%' }, readyTitle: { marginTop: 22 }, paragraph: { marginTop: 7 }, photoPlaceholder: { alignItems: 'center', backgroundColor: '#F4F1E8', borderColor: '#D7CDBB', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, height: 340, justifyContent: 'center', paddingHorizontal: 24 }, placeholderIcon: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderColor: ShelfieColors.borderSoft, borderRadius: 18, borderWidth: 1, height: 58, justifyContent: 'center', marginBottom: 14, width: 58 }, placeholderCopy: { marginTop: 7, maxWidth: 220, textAlign: 'center' }, photoSummary: { alignItems: 'center', flexDirection: 'row', gap: 14 }, processingPhoto: { backgroundColor: ShelfieColors.spine, borderRadius: ShelfieRadius.sm, height: 70, width: 52 }, photoSummaryCopy: { flex: 1 }, summaryText: { marginTop: 8 }, analysisTitle: { marginTop: 30, maxWidth: 280 }, processingCard: { marginTop: 28 }, infoNote: { marginTop: 18, paddingHorizontal: 2 }, demoStates: { marginTop: 28 }, demoStateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 }, demoChip: { backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.sm, paddingHorizontal: 10, paddingVertical: 7 }, demoChipText: { color: ShelfieColors.primary },
  photoSummaryFallback: { alignItems: 'center', backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.sm, height: 70, justifyContent: 'center', width: 52 },
  reviewPhotoCard: { alignItems: 'center', backgroundColor: ShelfieColors.surfaceTint, borderRadius: ShelfieRadius.lg, flexDirection: 'row', gap: 14, overflow: 'hidden', padding: 12 },
  reviewPhoto: { backgroundColor: ShelfieColors.spine, borderRadius: ShelfieRadius.sm, height: 92, width: 74 },
  reviewPhotoFallback: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderRadius: ShelfieRadius.sm, height: 92, justifyContent: 'center', width: 74 },
  reviewPhotoCopy: { flex: 1 },
  summaryCard: { marginBottom: 4 }, summaryRow: { alignItems: 'center', flexDirection: 'row', gap: 12 }, divider: { backgroundColor: '#F0EADE', height: 1, marginVertical: 16 }, reviewCopy: { color: ShelfieColors.review }, section: { marginTop: 26 }, sectionLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, sectionLabel: { letterSpacing: 1, textTransform: 'uppercase' }, sectionRule: { backgroundColor: '#EFE7D6', flex: 1, height: 1 }, greenRule: { backgroundColor: '#E7EFE8' }, amberRule: { backgroundColor: '#EFE7D6' }, sectionHint: { marginTop: 9 }, reviewListCard: { marginTop: 10 }, progressTrack: { backgroundColor: ShelfieColors.divider, borderRadius: ShelfieRadius.full, height: 4, marginBottom: 14, marginHorizontal: 20, overflow: 'hidden' }, progressFill: { backgroundColor: ShelfieColors.primary, borderRadius: ShelfieRadius.full, height: '100%' }, formLabel: { letterSpacing: 1, marginTop: 22, textTransform: 'uppercase' }, detectedCard: { marginTop: 11 }, suggestedCard: { borderColor: '#EBD9B4', borderWidth: 1.5, marginTop: 11 }, suggestedTitle: { fontSize: 26, lineHeight: 30 }, badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, reviewActions: { gap: 9, marginTop: 22 },
  detectedSummary: { alignItems: 'center', backgroundColor: ShelfieColors.surfaceTint, borderRadius: 16, flexDirection: 'row', gap: 12, padding: 14 }, searchDetected: { marginTop: 5 }, searchBox: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderColor: ShelfieColors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, height: 48, marginTop: 18, paddingHorizontal: 14 }, searchInput: { color: ShelfieColors.ink, flex: 1, fontFamily: 'DMSans', fontSize: 15 }, catalogResult: { alignItems: 'center', backgroundColor: ShelfieColors.surface, borderColor: ShelfieColors.borderSoft, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, padding: 14 }, catalogSelected: { borderColor: '#D79A2B', borderWidth: 1.5 }, catalogCopy: { flex: 1 }, edition: { marginTop: 8 }, radio: { alignItems: 'center', borderColor: ShelfieColors.border, borderRadius: ShelfieRadius.full, borderWidth: 1.5, height: 24, justifyContent: 'center', width: 24 }, radioSelected: { backgroundColor: ShelfieColors.primary, borderColor: ShelfieColors.primary }, radioCheck: { color: ShelfieColors.onPrimary, fontSize: 13 }, noCatalogMatch: { marginTop: 18 },
  spineBook: { alignItems: 'center', borderRadius: 5, height: 116, justifyContent: 'center', overflow: 'hidden', width: 56 }, compactSpineBook: { height: 70, width: 52 }, spineText: { color: 'rgba(255,255,255,0.78)', fontSize: 24, lineHeight: 28, textAlign: 'center' }, outcomeIcon: { alignItems: 'center', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 }, outcomeTitle: { marginTop: 20, maxWidth: 310 }, outcomeCopy: { marginTop: 9 }, tryCard: { marginTop: 24 }, tryTip: { marginTop: 11 }, retainedCard: { alignItems: 'center', flexDirection: 'row', gap: 13, marginTop: 18 }, retainedCopy: { flex: 1 }, confidenceDivider: { backgroundColor: '#F0EADE', height: 1, marginVertical: 16 }, confidenceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, confidenceBadges: { alignItems: 'center', flexDirection: 'row', gap: 9 }, confidenceValue: { color: ShelfieColors.review }, confidenceMeter: { backgroundColor: '#F1ECE1', borderRadius: ShelfieRadius.full, height: 6, marginTop: 11, overflow: 'hidden' }, confidenceFill: { backgroundColor: ShelfieColors.reviewAccent, borderRadius: ShelfieRadius.full, height: '100%' }, reviewActionRow: { flexDirection: 'row', gap: 9 }, reviewCorrectButton: { flex: 1 }, reviewDiscardButton: { width: 112 }, reviewError: { color: ShelfieColors.noMatch, textAlign: 'center' }, reviewFooterNote: { marginTop: 10, textAlign: 'center' }, resultsCount: { marginTop: 18 },
});

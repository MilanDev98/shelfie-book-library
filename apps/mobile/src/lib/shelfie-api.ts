import * as Device from 'expo-device';
import { fetch as expoFetch } from 'expo/fetch';
import { File as ExpoFile } from 'expo-file-system';
import { Platform } from 'react-native';

export type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export class ShelfieApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ShelfieApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type SavedLibraryBook = {
  id: number;
  catalog_id: string;
  title: string;
  author: string;
  edition: string;
  saved_at: string;
};

export type LibraryListResponse = {
  count: number;
  results: SavedLibraryBook[];
};

export type LibrarySaveResponse = {
  created: SavedLibraryBook[];
  already_saved: SavedLibraryBook[];
};

export type CatalogCandidate = {
  catalog_id: string;
  title: string;
  author: string;
  edition: string;
  score?: number;
  title_score?: number;
  author_score?: number;
};

export type CatalogBookDetail = CatalogCandidate & {
  alternate_titles: string[];
  author_aliases: string[];
  contained_titles: string[];
};

export type CatalogLookupResponse = {
  count: number;
  results: CatalogCandidate[];
};

export type AnalyzedBook = {
  id: number;
  title: string | null;
  author: string | null;
  readable: boolean;
  catalog: {
    status: 'matched' | 'not_sure' | 'not_found';
    match: CatalogCandidate | null;
    candidates: CatalogCandidate[];
  };
};

export type AnalyzeReadResponse = {
  status: 'completed';
  model: string;
  vision_model: string;
  detection_count: number;
  truncated: boolean;
  books: AnalyzedBook[];
  timings_ms: {
    model_load: number;
    preprocess: number;
    inference: number;
    postprocess: number;
    total: number;
  };
  persisted: false;
};

const REQUEST_TIMEOUT_MS = 90_000;

function baseUrl(): string {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!configuredBaseUrl) {
    throw new ShelfieApiError(
      'Shelfie is not connected to Django yet. Set EXPO_PUBLIC_API_URL in apps/mobile/.env.',
      0,
      'api_not_configured',
    );
  }

  // A physical iPhone must use the Mac's LAN address, but the iOS Simulator
  // shares the Mac's loopback interface. Prefer loopback there so simulator
  // API calls keep working even when the current Wi-Fi/hotspot blocks clients
  // from reaching the Mac through its own LAN address.
  if (__DEV__ && Platform.OS === 'ios' && !Device.isDevice) {
    const url = new URL(configuredBaseUrl);
    if (url.protocol === 'http:' && url.port === '8000') {
      url.hostname = '127.0.0.1';
      return url.toString().replace(/\/$/, '');
    }
  }

  return configuredBaseUrl;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const controller = new AbortController();
  const callerSignal = options.signal;
  let timedOut = false;
  const abortForCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener('abort', abortForCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await expoFetch(url, { ...options, signal: controller.signal });
  } catch (caught) {
    if (caught instanceof ShelfieApiError) {
      throw caught;
    }
    if (caught instanceof Error && caught.name === 'AbortError' && timedOut) {
      throw new ShelfieApiError(
        'The Shelfie server took too long to respond. Check the API and try again.',
        0,
        'request_timeout',
      );
    }
    if (caught instanceof Error && caught.name === 'AbortError') {
      throw new ShelfieApiError('Analysis canceled.', 0, 'request_canceled');
    }
    throw new ShelfieApiError(
      'Could not reach the Shelfie server. Check your Wi-Fi connection and API URL.',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', abortForCaller);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as {
      detail?: string;
      error?: ApiErrorPayload;
      [field: string]: unknown;
    };
    const validationMessage = Object.entries(payload)
      .filter(([field]) => field !== 'detail' && field !== 'error')
      .flatMap(([, value]) => Array.isArray(value) ? value : [value])
      .find((value): value is string => typeof value === 'string');
    throw new ShelfieApiError(
      payload.error?.message ?? payload.detail ?? validationMessage ?? `The Shelfie server returned ${response.status}.`,
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  }

  return response.json() as Promise<T>;
}

export function getSavedLibrary(signal?: AbortSignal): Promise<LibraryListResponse> {
  return request<LibraryListResponse>('/api/v1/library/books', { signal });
}

export function searchCatalog(query: string): Promise<CatalogLookupResponse> {
  const params = new URLSearchParams({ q: query.trim(), limit: '10' });
  return request<CatalogLookupResponse>(`/api/v1/catalog?${params.toString()}`);
}

export function getCatalogBook(catalogId: string, signal?: AbortSignal): Promise<CatalogBookDetail> {
  return request<CatalogBookDetail>(`/api/v1/catalog/${encodeURIComponent(catalogId)}`, { signal });
}

export function saveConfirmedBooks(catalogIds: string[]): Promise<LibrarySaveResponse> {
  return request<LibrarySaveResponse>('/api/v1/library/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalog_ids: catalogIds }),
  });
}

const imageExtensionsByMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
} as const;

function uploadMetadata(fileType: string, pickerType: string | null | undefined, fileName: string | null | undefined) {
  const normalizedFileType = fileType.toLowerCase();
  const normalizedPickerType = pickerType?.toLowerCase() ?? '';
  const originalName = fileName || 'shelf-photo';
  const originalExtension = originalName.match(/\.[^./]+$/)?.[0]?.toLowerCase() ?? '';
  const mimeFromExtension = Object.entries(imageExtensionsByMime)
    .find(([, extension]) => extension === originalExtension)?.[0];
  const supportedMime = [normalizedFileType, normalizedPickerType, mimeFromExtension]
    .find((mime): mime is keyof typeof imageExtensionsByMime => typeof mime === 'string' && mime in imageExtensionsByMime);

  if (!supportedMime) {
    return { fileName: originalName, mimeType: normalizedFileType || normalizedPickerType };
  }

  return {
    fileName: `${originalName.replace(/\.[^./]+$/, '')}${imageExtensionsByMime[supportedMime]}`,
    mimeType: supportedMime,
  };
}

export async function analyzeShelfPhoto(photo: {
  uri: string;
  file?: Blob;
  fileName?: string | null;
  mimeType?: string | null;
}, signal?: AbortSignal): Promise<AnalyzeReadResponse> {
  const form = new FormData();
  if (photo.file) {
    const { fileName, mimeType } = uploadMetadata(photo.file.type, photo.mimeType, photo.fileName);
    const upload = mimeType && photo.file.type !== mimeType
      ? photo.file.slice(0, photo.file.size, mimeType)
      : photo.file;
    form.append('image', upload, fileName);
  } else {
    const file = new ExpoFile(photo.uri);
    const { fileName, mimeType } = uploadMetadata(file.type, photo.mimeType, photo.fileName || file.name);
    const upload = mimeType && file.type !== mimeType
      ? file.slice(0, file.size, mimeType)
      : file;
    form.append('image', upload, fileName);
  }
  form.append('prompt', 'book spine');
  form.append('threshold', '0.3');

  return request<AnalyzeReadResponse>('/api/v1/analyze/read', {
    method: 'POST',
    body: form,
    signal,
  });
}

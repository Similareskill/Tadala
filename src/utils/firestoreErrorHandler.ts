/**
 * Detects if a Firestore error is genuinely caused by Google Cloud / Firebase resource exhaustion.
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const str =
    typeof error === 'object' && error !== null && 'message' in (error as Record<string, unknown>)
      ? String((error as Record<string, unknown>).message)
      : String(error);
  const code =
    typeof error === 'object' && error !== null && 'code' in (error as Record<string, unknown>)
      ? String((error as Record<string, unknown>).code)
      : '';

  return (
    code === 'resource-exhausted' ||
    code === '8' ||
    str.includes('Quota limit exceeded') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('Quota exceeded') ||
    str.includes('Free daily read units per project') ||
    str.includes('Free daily write units per project')
  );
}

type QuotaListener = (isExceeded: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();
const networkDisablers: Set<() => Promise<void>> = new Set();
const QUOTA_STORAGE_KEY = 'craft_firestore_quota_exceeded_ts';

// Clear any stale quota flag from localStorage so devices are never locked out
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  }
} catch {}

let quotaExceededState = false;

export function registerFirestoreNetworkDisabler(disabler: () => Promise<void>) {
  networkDisablers.add(disabler);
}

export function notifyQuotaExceeded() {
  quotaExceededState = true;
  quotaListeners.forEach((fn) => {
    try {
      fn(true);
    } catch {}
  });
}

export function resetQuotaState() {
  quotaExceededState = false;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    }
  } catch {}
  quotaListeners.forEach((fn) => {
    try {
      fn(false);
    } catch {}
  });
}

export function subscribeQuotaState(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  listener(quotaExceededState);
  return () => quotaListeners.delete(listener);
}

export function getIsQuotaExceeded(): boolean {
  return quotaExceededState;
}

/**
 * Safely executes a Firestore remote write.
 * Always attempts the write so multi-device synchronization is not blocked.
 */
export async function executeSafeFirestoreWrite(
  writeAction: () => Promise<void>,
  contextName?: string
): Promise<void> {
  try {
    await writeAction();
    // If write succeeds, ensure quota state is cleared
    if (quotaExceededState) {
      resetQuotaState();
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      notifyQuotaExceeded();
      console.warn(`[Firestore Quota Notice] Cota em ${contextName || 'operação'}:`, error);
    } else {
      console.warn(`[Firestore Write Notice] Aviso em ${contextName || 'operação'}:`, error);
    }
    // Re-throw or let optimistic UI handle it
  }
}

// Global browser listeners
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaExceededError(event.reason)) {
      event.preventDefault();
      notifyQuotaExceeded();
    }
  });
}


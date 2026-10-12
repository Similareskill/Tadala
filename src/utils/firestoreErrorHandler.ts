/**
 * Detects if a Firestore error is caused by Google Cloud / Firebase Free Tier daily quota exhaustion.
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
    str.includes('Free daily read units') ||
    str.includes('quota metric')
  );
}

type QuotaListener = (isExceeded: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();
let quotaExceededState = false;

export function notifyQuotaExceeded() {
  if (!quotaExceededState) {
    quotaExceededState = true;
    quotaListeners.forEach((fn) => {
      try {
        fn(true);
      } catch {}
    });
  }
}

export function subscribeQuotaState(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  listener(quotaExceededState);
  return () => quotaListeners.delete(listener);
}

export function getIsQuotaExceeded(): boolean {
  return quotaExceededState;
}

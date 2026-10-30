/**
 * Zero-quota handler stub: Firestore has been completely removed.
 * All device state synchronization is handled purely by the server and global mesh relay.
 */
export function isQuotaExceededError(_error: unknown): boolean {
  return false;
}

type QuotaListener = (isExceeded: boolean) => void;

export function registerFirestoreNetworkDisabler(_disabler: () => Promise<void>) {}

export function notifyQuotaExceeded() {}

export function resetQuotaState() {}

export function subscribeQuotaState(listener: QuotaListener): () => void {
  listener(false);
  return () => {};
}

export function getIsQuotaExceeded(): boolean {
  return false;
}

export async function executeSafeFirestoreWrite(
  writeAction: () => Promise<void>,
  _contextName?: string
): Promise<void> {
  try {
    await writeAction();
  } catch {}
}

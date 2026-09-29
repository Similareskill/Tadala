// Currency and number formatting helper
export function formatCurrency(amount: number | undefined, symbol = 'R$'): string {
  if (amount === undefined || isNaN(amount)) return `${symbol} 0,00`;
  const formatted = amount.toFixed(2).replace('.', ',');
  return `${symbol} ${formatted}`;
}

// Relative time formatting in Portuguese
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes === 1) return 'há 1 minuto';
    if (diffInMinutes < 60) return `há ${diffInMinutes} minutos`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return 'há 1 hora';
    if (diffInHours < 24) return `há ${diffInHours} horas`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'ontem';
    return `há ${diffInDays} dias`;
  } catch {
    return 'recentemente';
  }
}

// Full date formatting in Portuguese
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// Tactile audio feedback synthesis (no external audio files needed)
export function playHapticSound(type: 'click' | 'toggle' | 'delete' = 'click') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'toggle') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.06);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'delete') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // Graceful fallback if audio is not allowed
  }
}

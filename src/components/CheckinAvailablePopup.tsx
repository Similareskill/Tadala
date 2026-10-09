import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Swords,
  Clock,
  Award,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  Shield,
  User,
  AlertCircle,
  BellRing,
} from 'lucide-react';
import { BossEvent, BossCheckin } from '../types/shopping';
import {
  bossService,
  formatTimeRemaining,
  isAutoConfirmMember,
  isAutoCheckinRemoved,
} from '../services/bossService';
import { playHapticSound } from '../utils/helpers';

interface CheckinAvailablePopupProps {
  bossEvents: BossEvent[];
  checkins: BossCheckin[];
  onShowToast: (msg: string) => void;
  onNavigateToCheckin: () => void;
  currentUserName?: string | null;
}

export const CheckinAvailablePopup: React.FC<CheckinAvailablePopupProps> = ({
  bossEvents,
  checkins,
  onShowToast,
  onNavigateToCheckin,
  currentUserName,
}) => {
  // Stored player nickname for rapid auto-fill
  const getInitialPlayerName = (): string => {
    try {
      return (
        currentUserName ||
        localStorage.getItem('craft_player_nickname') ||
        localStorage.getItem('shopping_user_name') ||
        ''
      );
    } catch {
      return '';
    }
  };

  const [playerName, setPlayerName] = useState<string>(getInitialPlayerName);
  const [activeBoss, setActiveBoss] = useState<BossEvent | null>(null);
  const [dismissedBossIds, setDismissedBossIds] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem('craft_dismissed_checkin_popups');
      if (raw) return new Set<string>(JSON.parse(raw));
    } catch {}
    return new Set<string>();
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ bossName: string; points: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  // Keep player name synced if currentUserName changes
  useEffect(() => {
    if (currentUserName && !playerName) {
      setPlayerName(currentUserName);
    }
  }, [currentUserName]);

  // Track which bosses we have already alerted in this session to prevent repeated chimes
  const alertedBossIdsRef = useRef<Set<string>>(new Set());

  // Save dismissed IDs to sessionStorage
  const markAsDismissed = (bossId: string) => {
    setDismissedBossIds((prev) => {
      const next = new Set(prev);
      next.add(bossId);
      try {
        sessionStorage.setItem('craft_dismissed_checkin_popups', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Listen for manual trigger requests (e.g. from Check-in view button or tests)
  useEffect(() => {
    const handleReopen = (e?: Event) => {
      // Clear session dismissed cache so open boss shows up
      try {
        sessionStorage.removeItem('craft_dismissed_checkin_popups');
      } catch {}
      setDismissedBossIds(new Set());

      // If specific boss provided in detail
      const customEvent = e as CustomEvent<{ bossId?: string }>;
      const targetBossId = customEvent?.detail?.bossId;
      if (targetBossId) {
        const found = bossEvents.find((b) => b.id === targetBossId);
        if (found) {
          const win = bossService.getCheckinWindowStatus(
            found.scheduledTime,
            found.checkinEndTime,
            found.checkinStartTime
          );
          setActiveBoss(found);
          setRemainingMs(win.remainingMs);
          setErrorMessage(null);
          playHapticSound('notification');
          return;
        }
      }

      // Otherwise pick first open boss
      const open = bossEvents.find((b) =>
        bossService.getCheckinWindowStatus(
          b.scheduledTime,
          b.checkinEndTime,
          b.checkinStartTime
        ).isOpen
      );
      if (open) {
        const win = bossService.getCheckinWindowStatus(
          open.scheduledTime,
          open.checkinEndTime,
          open.checkinStartTime
        );
        setActiveBoss(open);
        setRemainingMs(win.remainingMs);
        setErrorMessage(null);
        playHapticSound('notification');
      } else {
        onShowToast('Nenhum check-in de Boss com janela aberta no momento.');
      }
    };

    window.addEventListener('reopen-checkin-popup', handleReopen);
    return () => window.removeEventListener('reopen-checkin-popup', handleReopen);
  }, [bossEvents, onShowToast]);

  // Find all currently open bosses that the user hasn't confirmed yet
  const unconfirmedOpenBosses = useMemo(() => {
    const cleanNick = playerName.trim().toLowerCase();

    return bossEvents.filter((boss) => {
      // 1. Is check-in currently open?
      const win = bossService.getCheckinWindowStatus(
        boss.scheduledTime,
        boss.checkinEndTime,
        boss.checkinStartTime
      );
      if (!win.isOpen) return false;

      // 2. Has the user dismissed this specific boss in this session?
      if (dismissedBossIds.has(boss.id)) return false;

      // 3. Has the player already confirmed for this boss?
      if (cleanNick) {
        const alreadyConfirmed = checkins.some(
          (c) =>
            c.bossId === boss.id &&
            c.userName.trim().toLowerCase() === cleanNick
        );
        if (alreadyConfirmed) return false;

        // Auto confirm member check (e.g., Ella)
        if (isAutoConfirmMember(cleanNick) && !isAutoCheckinRemoved(boss.id, cleanNick)) {
          return false;
        }
      }

      return true;
    });
  }, [bossEvents, checkins, playerName, dismissedBossIds]);

  // Ticker to check every 3 seconds for newly opened check-ins and update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      // If we currently have an active boss in popup, update its countdown
      if (activeBoss) {
        const win = bossService.getCheckinWindowStatus(
          activeBoss.scheduledTime,
          activeBoss.checkinEndTime,
          activeBoss.checkinStartTime
        );
        if (win.isOpen) {
          setRemainingMs(win.remainingMs);
        } else {
          // Window closed while popup was open
          setActiveBoss(null);
          setSuccessInfo(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBoss]);

  // Trigger popup when a new unconfirmed open boss is detected
  useEffect(() => {
    // If we're already showing a popup or showing success, don't interrupt
    if (activeBoss || successInfo) return;

    if (unconfirmedOpenBosses.length > 0) {
      // Pick the first available open boss
      const candidate = unconfirmedOpenBosses[0];
      const win = bossService.getCheckinWindowStatus(
        candidate.scheduledTime,
        candidate.checkinEndTime,
        candidate.checkinStartTime
      );

      setActiveBoss(candidate);
      setRemainingMs(win.remainingMs);
      setErrorMessage(null);

      // Play audio notification chime if this is the first time alerting this boss
      if (!alertedBossIdsRef.current.has(candidate.id)) {
        alertedBossIdsRef.current.add(candidate.id);
        playHapticSound('notification');
      }
    }
  }, [unconfirmedOpenBosses, activeBoss, successInfo]);

  // Handle user confirming presence right from the popup
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBoss) return;

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setErrorMessage('Por favor, informe seu Nome ou Nick de jogador.');
      return;
    }

    // Persist player nickname locally
    try {
      localStorage.setItem('craft_player_nickname', trimmedName);
    } catch {}

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await bossService.confirmCheckin(activeBoss, trimmedName);

      if (result.success) {
        playHapticSound('success');
        setSuccessInfo({
          bossName: activeBoss.bossName,
          points: activeBoss.points,
        });
        onShowToast(`🎉 Presença confirmada no Boss "${activeBoss.bossName}"! (+${activeBoss.points} pts)`);

        // Mark as dismissed so it doesn't pop up again for this boss
        markAsDismissed(activeBoss.id);

        // Auto close after 2.4s
        setTimeout(() => {
          setSuccessInfo(null);
          setActiveBoss(null);
        }, 2400);
      } else {
        setErrorMessage(result.error || 'Não foi possível confirmar o check-in.');
        playHapticSound('delete');
      }
    } catch (err) {
      console.error('Error confirming checkin from popup:', err);
      setErrorMessage('Erro ao comunicar com o servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    if (activeBoss) {
      markAsDismissed(activeBoss.id);
    }
    setActiveBoss(null);
    setSuccessInfo(null);
    setErrorMessage(null);
    playHapticSound('click');
  };

  const handleGoToAllBosses = () => {
    if (activeBoss) {
      markAsDismissed(activeBoss.id);
    }
    setActiveBoss(null);
    setSuccessInfo(null);
    onNavigateToCheckin();
    playHapticSound('toggle');
  };

  // If no popup to display, render nothing
  if (!activeBoss && !successInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-indigo-200/80 overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* SUCCESS VIEW */}
        {successInfo ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                CHECK-IN CONFIRMADO!
              </span>
              <h3 className="text-xl font-black text-[#131b2e] font-display pt-1">
                {successInfo.bossName}
              </h3>
              <p className="text-xs text-[#64748b]">
                Sua presença foi registrada na lista da guilda.
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 inline-flex items-center gap-2 text-amber-950 font-bold text-sm">
              <Award className="w-5 h-5 text-amber-600 shrink-0" />
              <span>+{successInfo.points} Pontos adicionados ao Rank!</span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessInfo(null);
                  setActiveBoss(null);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : activeBoss ? (
          /* ACTIVE POPUP FORM */
          <div>
            {/* Header with gradient banner */}
            <div className="p-5 bg-gradient-to-r from-[#200e94] via-[#2a14b4] to-[#3730a3] text-white relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                      <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
                    </div>
                    {/* Pulsing notification dot */}
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-[#200e94]" />
                    </span>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/90 text-white mb-1 shadow-2xs">
                      <BellRing className="w-3 h-3" />
                      <span>NOVO CHECK-IN DISPONÍVEL!</span>
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg leading-tight font-display">
                      Confirmar Presença de Boss
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white/80 hover:text-white shrink-0"
                  title="Fechar (Lembrar mais tarde)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {unconfirmedOpenBosses.length > 1 && (
                <div className="mt-3 text-[11px] text-indigo-200 bg-white/10 px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                  <span>Há <strong>{unconfirmedOpenBosses.length}</strong> check-ins abertos aguardando você!</span>
                </div>
              )}
            </div>

            {/* Boss details card */}
            <form onSubmit={handleConfirmSubmit} className="p-5 space-y-4">
              <div className="bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] rounded-2xl p-4 border border-[#e2e8f0] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-[#2a14b4]" />
                    <span className="font-black text-base text-[#131b2e] font-display">
                      {activeBoss.bossName}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {activeBoss.category}
                  </span>
                </div>

                {activeBoss.description && (
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    {activeBoss.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e2e8f0]/80">
                  {/* Points reward */}
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>+{activeBoss.points} Pontos no Rank</span>
                  </div>

                  {/* Countdown remaining */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="tabular-nums">
                      Resta: {formatTimeRemaining(remainingMs)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Name input */}
              <div>
                <label className="block text-xs font-bold text-[#1e293b] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#2a14b4]" />
                    <span>Seu Nome ou Nick de Jogador</span>
                  </span>
                  <span className="text-[10px] text-rose-500 font-semibold">*Obrigatório</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Ex: Ella, Thorin, Zephyr..."
                    className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] focus:border-transparent text-[#131b2e] bg-[#fafbfc]"
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-1">
                  Seu nome ficará salvo para os próximos check-ins automáticos e será somado no <strong>Rank de Pontos</strong>.
                </p>

                {isAutoConfirmMember(playerName) && (
                  <div className="mt-2 p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>O membro <strong>{playerName}</strong> possui confirmação automática ativa!</span>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !playerName.trim()}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-700/20 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 group active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>{isSubmitting ? 'Confirmando Presença...' : 'Confirmar Presença Agora'}</span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-xs font-semibold text-[#64748b] hover:text-[#1e293b] px-3 py-1.5 rounded-xl hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                  >
                    Lembrar mais tarde
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToAllBosses}
                    className="text-xs font-bold text-[#2a14b4] hover:text-[#200e94] px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Ver todos os Bosses</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};

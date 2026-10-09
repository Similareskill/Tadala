import React, { useState, useEffect } from 'react';
import {
  Swords,
  Clock,
  Award,
  Plus,
  CheckCircle2,
  Calendar,
  Trash2,
  Sparkles,
  Flame,
  AlertCircle,
  Users,
  Search,
  ChevronRight,
  Trophy,
  Shield,
  X,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { BossEvent, BossCheckin } from '../types/shopping';
import {
  bossService,
  formatTimeRemaining,
  isAutoConfirmMember,
  isAutoCheckinRemoved,
  getRemovedAutoCheckins,
} from '../services/bossService';
import { activityLogService } from '../services/activityLogService';
import { playHapticSound } from '../utils/helpers';

interface BossCheckinViewProps {
  bossEvents: BossEvent[];
  checkins: BossCheckin[];
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
  onNavigateToRank: () => void;
  onShowToast: (msg: string) => void;
}

export const BossCheckinView: React.FC<BossCheckinViewProps> = ({
  bossEvents,
  checkins,
  isAdmin = false,
  onRequireAdmin,
  onNavigateToRank,
  onShowToast,
}) => {
  // Live ticker to update countdowns every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter state
  const [filter, setFilter] = useState<'todos' | 'abertos' | 'proximos' | 'encerrados'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [search, setSearch] = useState('');

  // Stored player nickname for rapid check-in
  const [visitorName, setVisitorName] = useState(() => {
    try {
      return (
        localStorage.getItem('craft_player_nickname') ||
        localStorage.getItem('shopping_user_name') ||
        ''
      );
    } catch {
      return '';
    }
  });

  // Check-in modal state
  const [checkinTargetBoss, setCheckinTargetBoss] = useState<BossEvent | null>(null);
  const [checkinInputName, setCheckinInputName] = useState(visitorName);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [bossToDelete, setBossToDelete] = useState<{ id: string; name: string } | null>(null);

  // Categories definition
  const BOSS_CATEGORIES = [
    'Boss Global',
    'Boss TA2,TA3,TA4',
    'Boss Anonimas 110 / Abadia 118',
    'Boss de Guilda',
    'Boss Gelo',
  ] as const;

  // New Boss Modal state (Admin / Member)
  const [isNewBossModalOpen, setIsNewBossModalOpen] = useState(false);
  const [newBossName, setNewBossName] = useState('');
  const [newBossPoints, setNewBossPoints] = useState<number>(5);
  const [newBossDateTime, setNewBossDateTime] = useState(() => {
    // Default to current date and time
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [newBossCategory, setNewBossCategory] = useState<string>('Boss Global');
  const [newCheckinStartDateTime, setNewCheckinStartDateTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [newCheckinEndDateTime, setNewCheckinEndDateTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 65);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  // Quick preset boss suggestions categorized under the 4 exact categories
  const PRESET_BOSSES: { name: string; category: (typeof BOSS_CATEGORIES)[number]; points: number }[] = [
    { name: 'Rotura', category: 'Boss Global', points: 1 },
    { name: 'Cavaleiro', category: 'Boss Global', points: 2 },
    { name: 'Gatfilian', category: 'Boss Global', points: 2 },
    { name: 'Hakir', category: 'Boss Global', points: 2 },
    { name: 'Stomid', category: 'Boss Global', points: 2 },
    { name: 'Tigdal', category: 'Boss Global', points: 2 },
    { name: 'Damiros', category: 'Boss Global', points: 3 },
    { name: 'Dardalroka', category: 'Boss Global', points: 3 },
    { name: 'Kafka', category: 'Boss Global', points: 3 },
    { name: 'Tandallon', category: 'Boss Global', points: 3 },
    { name: 'Global', category: 'Boss Global', points: 4 },
    { name: 'Karnius', category: 'Boss Global', points: 4 },
    { name: 'Melvile', category: 'Boss Global', points: 4 },
    { name: 'Pander', category: 'Boss Global', points: 4 },
    { name: 'Épica Anônima', category: 'Boss Anonimas 110 / Abadia 118', points: 3 },
    { name: 'Loccius-Abadia', category: 'Boss Anonimas 110 / Abadia 118', points: 3 },
    { name: 'Zerkal-118', category: 'Boss Anonimas 110 / Abadia 118', points: 5 },
    { name: 'Τ.Α 2/Τ.Α 3', category: 'Boss TA2,TA3,TA4', points: 5 },
    { name: 'Τ.Α 4', category: 'Boss TA2,TA3,TA4', points: 5 },
    { name: 'Baltazar', category: 'Boss de Guilda', points: 5 },
    { name: 'Cruzada', category: 'Boss de Guilda', points: 5 },
    { name: 'Dominação', category: 'Boss de Guilda', points: 5 },
    { name: 'GvG', category: 'Boss de Guilda', points: 5 },
  ];

  // Handle open check-in modal
  const handleOpenCheckin = (boss: BossEvent) => {
    setCheckinTargetBoss(boss);
    setCheckinInputName(visitorName);
  };

  // Submit check-in confirmation
  const handleConfirmCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinTargetBoss) return;
    const name = checkinInputName.trim();
    if (!name) {
      onShowToast('Por favor, informe seu nome ou nick de jogador.');
      return;
    }

    setIsSubmittingCheckin(true);
    const res = await bossService.confirmCheckin(checkinTargetBoss, name);
    setIsSubmittingCheckin(false);

    if (res.success) {
      playHapticSound('toggle');
      setVisitorName(name);
      try {
        localStorage.setItem('craft_player_nickname', name);
      } catch {}
      activityLogService.log({
        type: 'boss_checkin',
        title: 'Check-in de Chefe Confirmado',
        description: `${name} confirmou presença no Chefe "${checkinTargetBoss.bossName}" (+${checkinTargetBoss.points} pts).`,
        userName: name,
        userRole: 'membro',
      });
      onShowToast(`Check-in confirmado para ${name}! +${checkinTargetBoss.points} pontos.`);
      setCheckinTargetBoss(null);
    } else {
      onShowToast(res.error || 'Erro ao confirmar check-in.');
    }
  };

  // Open Add Boss modal with refreshed datetime
  const handleOpenNewBossModal = () => {
    if (!isAdmin) {
      onRequireAdmin?.('adicionar novos Bosses à guilda');
      return;
    }
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    const startStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    const dEnd = new Date(d.getTime() + 60 * 60000);
    const endStr = new Date(dEnd.getTime() - dEnd.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setNewBossDateTime(startStr);
    setNewCheckinStartDateTime(startStr);
    setNewCheckinEndDateTime(endStr);
    setIsNewBossModalOpen(true);
  };

  // Handle create Boss
  const handleCreateBossSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      onRequireAdmin?.('adicionar novos Bosses à guilda');
      return;
    }

    const trimmedName = newBossName.trim();
    if (!trimmedName) {
      onShowToast('Informe o nome do Boss.');
      return;
    }

    if (!newBossDateTime) {
      onShowToast('Informe a data e horário do Boss.');
      return;
    }

    let scheduledIso: string;
    try {
      const d = new Date(newBossDateTime);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date');
      }
      scheduledIso = d.toISOString();
    } catch {
      onShowToast('Data e horário inválidos.');
      return;
    }

    let checkinStartIso = scheduledIso;
    if (newCheckinStartDateTime) {
      try {
        const dStart = new Date(newCheckinStartDateTime);
        if (!isNaN(dStart.getTime())) {
          checkinStartIso = dStart.toISOString();
        }
      } catch {}
    }

    let checkinEndIso: string | undefined;
    if (newCheckinEndDateTime) {
      try {
        const dEnd = new Date(newCheckinEndDateTime);
        if (!isNaN(dEnd.getTime())) {
          checkinEndIso = dEnd.toISOString();
        }
      } catch {}
    }

    if (checkinEndIso && new Date(checkinEndIso).getTime() <= new Date(checkinStartIso).getTime()) {
      onShowToast('O término do período de check-in deve ser posterior ao início.');
      return;
    }

    const clampedPoints = Math.min(100, Math.max(1, Math.round(Number(newBossPoints) || 1)));

    await bossService.addBossEvent({
      bossName: trimmedName,
      scheduledTime: scheduledIso,
      checkinStartTime: checkinStartIso,
      checkinEndTime: checkinEndIso,
      points: clampedPoints,
      category: newBossCategory || 'Boss Global',
      createdBy: isAdmin ? 'Admin' : (visitorName || 'Membro da Guilda'),
    });

    playHapticSound('toggle');
    onShowToast(`Boss "${trimmedName}" agendado com sucesso!`);
    setIsNewBossModalOpen(false);
    setNewBossName('');
  };

  // Handle delete boss (Admin only)
  const handleDeleteBoss = (id: string, name: string) => {
    if (!isAdmin) {
      onRequireAdmin?.('remover agendamento de Boss');
      return;
    }
    setBossToDelete({ id, name });
  };

  const handleConfirmDeleteBoss = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('remover agendamento de Boss');
      return;
    }
    if (!bossToDelete) return;
    await bossService.deleteBossEvent(bossToDelete.id);
    playHapticSound('delete');
    onShowToast(`Boss "${bossToDelete.name}" removido com sucesso.`);
    setBossToDelete(null);
  };

  // Check-in removal state & handler
  const [checkinToDelete, setCheckinToDelete] = useState<{
    id: string;
    bossName: string;
    userName: string;
    bossId?: string;
    isAuto?: boolean;
  } | null>(null);

  const [clearBossConfirmadosTarget, setClearBossConfirmadosTarget] = useState<BossEvent | null>(null);
  const [isRemoveAllAutoModalOpen, setIsRemoveAllAutoModalOpen] = useState(false);
  const [isProcessingAutoAction, setIsProcessingAutoAction] = useState(false);

  const handleRemoveCheckin = (
    checkinId: string,
    bossName: string,
    userName?: string,
    bossId?: string,
    isAuto?: boolean
  ) => {
    const isMe = visitorName && userName && visitorName.toLowerCase() === userName.toLowerCase();
    if (!isAdmin && !isMe) {
      onRequireAdmin?.('remover presenças confirmadas no Boss');
      return;
    }
    setCheckinToDelete({
      id: checkinId,
      bossName,
      userName: userName || visitorName || 'Jogador',
      bossId,
      isAuto: isAuto ?? (userName ? isAutoConfirmMember(userName) : false),
    });
  };

  const handleConfirmDeleteCheckin = async () => {
    if (!checkinToDelete) return;
    try {
      const isAuto = checkinToDelete.isAuto ?? isAutoConfirmMember(checkinToDelete.userName);
      await bossService.deleteCheckin(checkinToDelete.id, checkinToDelete.bossId, checkinToDelete.userName);
      playHapticSound('delete');
      if (isAuto) {
        onShowToast(`Confirmação do auto-checkin de "${checkinToDelete.userName}" removida para o Boss "${checkinToDelete.bossName}".`);
      } else {
        onShowToast(`Check-in de "${checkinToDelete.userName}" removido com sucesso.`);
      }
    } catch (e) {
      console.error(e);
      onShowToast('Erro ao remover check-in.');
    } finally {
      setCheckinToDelete(null);
    }
  };

  const handleRemoveAllAutoCheckins = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('remover todas as confirmações do auto-checkin');
      return;
    }
    try {
      setIsProcessingAutoAction(true);
      await bossService.removeAllAutoCheckins('Ella');
      playHapticSound('delete');
      onShowToast('Confirmações de auto-checkin de Ella removidas de todos os Bosses.');
      setIsRemoveAllAutoModalOpen(false);
    } catch (e) {
      console.error(e);
      onShowToast('Erro ao remover auto-checkins.');
    } finally {
      setIsProcessingAutoAction(false);
    }
  };

  const handleRestoreAllAutoCheckins = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('restaurar confirmações do auto-checkin');
      return;
    }
    try {
      setIsProcessingAutoAction(true);
      await bossService.restoreAllAutoCheckins('Ella');
      playHapticSound('toggle');
      onShowToast('Confirmações de auto-checkin de Ella restauradas em todos os Bosses!');
    } catch (e) {
      console.error(e);
      onShowToast('Erro ao restaurar auto-checkins.');
    } finally {
      setIsProcessingAutoAction(false);
    }
  };

  const handlePromptClearBossConfirmados = (boss: BossEvent) => {
    if (!isAdmin) {
      onRequireAdmin?.('remover confirmados deste Boss');
      return;
    }
    setClearBossConfirmadosTarget(boss);
  };

  const handleConfirmClearBossConfirmados = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('remover confirmados deste Boss');
      return;
    }
    if (!clearBossConfirmadosTarget) return;
    const targetCheckins = checkins.filter((c) => c.bossId === clearBossConfirmadosTarget.id);
    for (const c of targetCheckins) {
      await bossService.deleteCheckin(c.id);
    }
    playHapticSound('delete');
    onShowToast(`Todos os confirmados do Boss "${clearBossConfirmadosTarget.bossName}" foram removidos.`);
    setClearBossConfirmadosTarget(null);
  };

  // State & Handlers to add +3 points to open check-ins
  const [isAddingBonusPoints, setIsAddingBonusPoints] = useState(false);

  const handleAddBonusToAllOpen = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('adicionar +3 pontos aos check-ins em aberto');
      return;
    }
    setIsAddingBonusPoints(true);
    playHapticSound('toggle');
    try {
      const res = await bossService.addBonusPointsToOpenCheckins(3, bossEvents, checkins);
      if (res.affectedBossesCount === 0) {
        onShowToast('Nenhum boss com check-in aberto no momento para receber +3 pontos.');
      } else {
        activityLogService.log({
          type: 'boss_checkin',
          title: 'Pontos de Bônus Adicionados (+3 pts)',
          description: `Adicionado +3 pontos aos check-ins já criados de ${res.affectedBossesCount} boss(es) em aberto (${res.affectedBossNames.join(', ')}) totalizando ${res.affectedCheckinsCount} check-in(s) atualizados.`,
          userName: visitorName || 'Admin',
          userRole: 'admin',
        });
        onShowToast(
          `+3 pontos adicionados com sucesso aos check-ins de ${res.affectedBossesCount} boss(es) em aberto (${res.affectedCheckinsCount} presenças atualizadas)!`
        );
      }
    } catch {
      onShowToast('Erro ao adicionar pontos de bônus aos check-ins.');
    } finally {
      setIsAddingBonusPoints(false);
    }
  };

  const handleAddBonusToBoss = async (boss: BossEvent) => {
    if (!isAdmin) {
      onRequireAdmin?.(`adicionar +3 pontos aos check-ins do boss "${boss.bossName}"`);
      return;
    }
    setIsAddingBonusPoints(true);
    playHapticSound('toggle');
    try {
      const res = await bossService.addBonusPointsToSingleBoss(boss.id, 3, bossEvents, checkins);
      activityLogService.log({
        type: 'boss_checkin',
        title: 'Pontos de Bônus Adicionados (+3 pts)',
        description: `Adicionado +3 pontos ao Boss "${boss.bossName}" (novo valor: ${res.newPoints} pts) e a todos os ${res.checkinsCount} check-in(s) já confirmados.`,
        userName: visitorName || 'Admin',
        userRole: 'admin',
      });
      onShowToast(
        `+3 pontos adicionados ao Boss "${boss.bossName}" (total: ${res.newPoints} pts) e a todos os ${res.checkinsCount} check-in(s) já confirmados!`
      );
    } catch {
      onShowToast('Erro ao adicionar pontos de bônus.');
    } finally {
      setIsAddingBonusPoints(false);
    }
  };

  // Helper for category badge colors
  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'Boss Global':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Boss TA2,TA3,TA4':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'Boss Anonimas 110 / Abadia 118':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Boss de Guilda':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Boss Gelo':
      case 'Boss gelo':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300';
      default:
        return 'bg-[#eaedff] text-[#2a14b4] border-[#c7d2fe]';
    }
  };

  // Filter bosses
  const filteredBosses = bossEvents.filter((b) => {
    const status = bossService.getCheckinWindowStatus(b.scheduledTime, b.checkinEndTime, b.checkinStartTime);
    if (filter === 'abertos' && !status.isOpen) return false;
    if (filter === 'proximos' && !status.isUpcoming) return false;
    if (filter === 'encerrados' && !status.isExpired) return false;

    if (categoryFilter !== 'todas' && b.category !== categoryFilter) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.bossName.toLowerCase().includes(q);
      const matchCat = (b.category || '').toLowerCase().includes(q);
      const matchDesc = (b.description || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  // Calculate my personal stats
  const myCheckins = checkins.filter(
    (c) => visitorName && c.userName.toLowerCase() === visitorName.toLowerCase()
  );
  const myTotalPoints = myCheckins.reduce((acc, c) => acc + c.points, 0);

  // Active open bosses count
  const openBossesCount = bossEvents.filter(
    (b) => bossService.getCheckinWindowStatus(b.scheduledTime, b.checkinEndTime, b.checkinStartTime).isOpen
  ).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-1">
            <span>Gestão de Craft</span>
            <span>&gt;</span>
            <span className="text-[#131b2e] font-bold">Check-in de Boss</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight font-display flex items-center gap-2.5">
              <span>Check-in de Boss</span>
            </h1>
            {openBossesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-xs animate-pulse">
                <Flame className="w-3.5 h-3.5" />
                {openBossesCount} ABERTO{openBossesCount > 1 ? 'S' : ''}!
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748b] mt-1 max-w-2xl">
            A cada horário de Boss há <strong>1h extra</strong> para todos os visitantes e membros confirmarem presença.
            Cada check-in acumula pontos para o <strong>Rank de Pontos</strong>!
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Button to add +3 pts to all open check-ins */}
          <button
            type="button"
            onClick={handleAddBonusToAllOpen}
            disabled={isAddingBonusPoints}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap border border-amber-300 disabled:opacity-50"
            title={
              isAdmin
                ? "Adicionar +3 pontos aos check-ins já criados de todos os Bosses em aberto (Admin)"
                : "Apenas o Administrador tem permissão para adicionar pontos (clique para autenticar)"
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-950 shrink-0" />
            <span>+3 pts (Abertos)</span>
            {!isAdmin && <Lock className="w-3 h-3 opacity-75 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNavigateToRank}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Ver Rank de Pontos</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={handleOpenNewBossModal}
            className="px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] active:bg-[#1a0c79] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
            title={isAdmin ? "Adicionar novo Boss (Admin)" : "Apenas o Administrador tem permissão para adicionar Boss (clique para autenticar)"}
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Boss</span>
            {!isAdmin && <Lock className="w-3 h-3 opacity-75 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Stats Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Open Bosses */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-bold">Check-ins Abertos</span>
              <Flame className="w-4 h-4 text-emerald-600 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-emerald-950 font-display">
              {openBossesCount}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Janela de 1h ativa para confirmar
            </p>
          </div>
          {openBossesCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('reopen-checkin-popup'))}
                className="text-[10px] font-extrabold text-emerald-800 hover:text-emerald-950 bg-emerald-200/80 hover:bg-emerald-300 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                title="Abrir Pop-up de confirmação rápida de check-in"
              >
                <Flame className="w-3 h-3 text-emerald-700" />
                <span>Ver Pop-up</span>
              </button>
              <button
                type="button"
                onClick={handleAddBonusToAllOpen}
                disabled={isAddingBonusPoints}
                className="text-[10px] font-black text-amber-950 bg-amber-300 hover:bg-amber-400 border border-amber-400 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                title="Adicionar +3 pontos aos check-ins já criados em aberto"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-900" />
                <span>+3 pts</span>
              </button>
            </div>
          )}
        </div>

        {/* Total Scheduled Bosses */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold">Total de Bosses</span>
            <Swords className="w-4 h-4 text-[#2a14b4]" />
          </div>
          <div className="text-2xl font-black text-[#131b2e] font-display">
            {bossEvents.length}
          </div>
          <p className="text-[10px] text-[#64748b] mt-0.5">
            Cadastrados na temporada
          </p>
        </div>

        {/* My Checkins */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold">Minhas Presenças</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-[#131b2e] font-display">
            {myCheckins.length}
          </div>
          <p className="text-[10px] text-[#64748b] mt-0.5 truncate">
            {visitorName ? `Nick: ${visitorName}` : 'Sem nick definido'}
          </p>
        </div>

        {/* My Accumulated Points */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold">Meus Pontos</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-display">
            {myTotalPoints} <span className="text-xs font-semibold text-amber-700">pts</span>
          </div>
          <p className="text-[10px] text-amber-800 mt-0.5">
            Soma dos check-ins realizados
          </p>
        </div>
      </div>

      {/* Auto-confirmation banner for member Ella */}
      <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200 shadow-2xs">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-purple-950">Auto-Confirmação Ativa:</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-purple-200/80 text-purple-900 border border-purple-300">
                Ella
              </span>
            </div>
            <p className="text-purple-900 font-medium text-[11px] mt-0.5">
              Presença garantida automaticamente em todos os Bosses. Você pode remover confirmações por Boss ou em massa abaixo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {isAdmin ? (
            <>
              {getRemovedAutoCheckins().length > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreAllAutoCheckins}
                  disabled={isProcessingAutoAction}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Restaurar todas as confirmações de auto-checkin de Ella removidas"
                >
                  <RotateCcw className="w-3 h-3 text-purple-600" />
                  <span>Restaurar Auto-Checkins</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsRemoveAllAutoModalOpen(true)}
                disabled={isProcessingAutoAction}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Remover confirmação do auto-checkin de Ella em todos os Bosses"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remover Confirmações (Todos)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRequireAdmin?.('remover confirmações do auto-checkin em massa')}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              title="Apenas o Administrador pode remover confirmações do auto-checkin em massa (clique para autenticar)"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Remover Confirmações</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#e2e8f0] shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'todos'
                  ? 'bg-[#2a14b4] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#f1f5f9]'
              }`}
            >
              Todos ({bossEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('abertos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'abertos'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Abertos (1h) ({openBossesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('proximos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'proximos'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#f1f5f9]'
              }`}
            >
              Próximos
            </button>
            <button
              type="button"
              onClick={() => setFilter('encerrados')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'encerrados'
                  ? 'bg-[#475569] text-white shadow-2xs'
                  : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
            >
              Encerrados
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por Boss ou local..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filter Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#f1f5f9]">
          <span className="text-[11px] font-bold text-[#64748b] mr-1">Categoria:</span>
          <button
            type="button"
            onClick={() => setCategoryFilter('todas')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              categoryFilter === 'todas'
                ? 'bg-[#131b2e] text-white shadow-2xs'
                : 'text-[#475569] hover:bg-[#f1f5f9]'
            }`}
          >
            Todas
          </button>
          {BOSS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#2a14b4] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#f1f5f9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Boss Cards List */}
      {filteredBosses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#faf8ff] text-[#2a14b4] flex items-center justify-center mx-auto">
            <Swords className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#131b2e]">
            Nenhum Boss encontrado
          </h3>
          <p className="text-xs text-[#64748b] max-w-md mx-auto">
            {search || filter !== 'todos'
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Nenhum horário de Boss agendado no momento. Administradores podem agendar novos Bosses pelo botão acima.'}
          </p>
          <button
            type="button"
            onClick={handleOpenNewBossModal}
            className="px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] active:bg-[#1a0c79] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Primeiro Boss</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBosses.map((boss) => {
            const status = bossService.getCheckinWindowStatus(boss.scheduledTime, boss.checkinEndTime, boss.checkinStartTime);
            const bossCheckins = checkins.filter((c) => c.bossId === boss.id);
            const userAlreadyCheckedIn =
              visitorName &&
              bossCheckins.some(
                (c) => c.userName.toLowerCase() === visitorName.toLowerCase()
              );
            const myCheckinForBoss = visitorName
              ? bossCheckins.find((c) => c.userName.toLowerCase() === visitorName.toLowerCase())
              : null;

            const scheduledDate = new Date(boss.scheduledTime);
            const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            });

            const windowStartDate = new Date(status.startMs);
            const formattedStartTime = windowStartDate.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const windowEndDate = new Date(status.endMs);
            const formattedEndTime = windowEndDate.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={boss.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-sm ${
                  status.isOpen
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-gradient-to-br from-white via-white to-emerald-50/30'
                    : status.isUpcoming
                    ? 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                    : 'border-slate-200 opacity-80 bg-slate-50/50'
                }`}
              >
                {/* Header: Name, Points & Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                            boss.category
                          )}`}
                        >
                          {boss.category || 'Boss'}
                        </span>

                        {/* Status Badge */}
                        {status.isOpen ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs animate-pulse">
                            <Flame className="w-3 h-3" />
                            CHECK-IN ABERTO!
                          </span>
                        ) : status.isUpcoming ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Clock className="w-3 h-3" />
                            Em breve
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            Encerrado
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-base sm:text-lg text-[#131b2e] tracking-tight leading-snug">
                        {boss.bossName}
                      </h3>
                    </div>

                    {/* Points Badge, +3 pts Button & Quick Delete Button */}
                    <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-black text-sm shadow-2xs">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span>+{boss.points} pts</span>
                      </div>

                      {/* Button to add +3 pts to this open boss and its check-ins */}
                      {status.isOpen && (
                        <button
                          type="button"
                          onClick={() => handleAddBonusToBoss(boss)}
                          disabled={isAddingBonusPoints}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-2xs border border-amber-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title={
                            isAdmin
                              ? `Adicionar +3 pontos aos check-ins já criados deste Boss "${boss.bossName}" (Admin)`
                              : "Apenas o Administrador pode adicionar pontos (clique para autenticar)"
                          }
                        >
                          <Sparkles className="w-3 h-3 text-amber-950" />
                          <span>+3 pts</span>
                          {!isAdmin && <Lock className="w-2.5 h-2.5 opacity-75 ml-0.5" />}
                        </button>
                      )}

                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteBoss(boss.id, boss.bossName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-200 active:scale-90"
                          title={`Remover este Boss "${boss.bossName}" (Admin)`}
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRequireAdmin?.('remover agendamento de Boss')}
                          className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                          title="Apenas o Administrador tem permissão para remover este Boss (clique para autenticar)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Schedule Details & 1-hour Extra Window */}
                  <div className="space-y-1.5 my-3 text-xs bg-[#f8fafc] rounded-xl p-3 border border-[#f1f5f9]">
                    <div className="flex items-center justify-between text-[#475569]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#2a14b4]" />
                        Horário do Boss:
                      </span>
                      <strong className="text-[#131b2e]">
                        {formattedDate}, às {formattedTime}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[#475569]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Período de Check-in:
                      </span>
                      <span className="font-semibold text-emerald-800">
                        {formattedStartTime} até {formattedEndTime}
                      </span>
                    </div>

                    {/* Countdown indicator */}
                    <div className="pt-1.5 border-t border-[#e2e8f0]/60 flex items-center justify-between">
                      <span className="text-[11px] text-[#64748b] font-medium">
                        {status.isOpen
                          ? 'Tempo restante para confirmar:'
                          : status.isUpcoming
                          ? 'Check-in inicia em:'
                          : 'Status:'}
                      </span>
                      <span
                        className={`text-xs font-black tabular-nums ${
                          status.isOpen
                            ? 'text-emerald-700 animate-pulse'
                            : status.isUpcoming
                            ? 'text-indigo-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {status.isOpen || status.isUpcoming
                          ? formatTimeRemaining(status.remainingMs)
                          : 'Período encerrado'}
                      </span>
                    </div>
                  </div>

                  {boss.description && (
                    <p className="text-xs text-[#64748b] mb-3 leading-relaxed">
                      {boss.description}
                    </p>
                  )}

                  {/* Confirmed Participants list */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] mb-1.5 flex-wrap gap-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#2a14b4]" />
                        Confirmados ({bossCheckins.length}):
                      </span>
                      <div className="flex items-center gap-2">
                        {bossCheckins.length > 0 && (
                          <span className="text-emerald-700 font-semibold text-[10px]">
                            +{bossCheckins.length * boss.points} pts distribuídos
                          </span>
                        )}
                        {bossCheckins.length > 0 && (
                          isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handlePromptClearBossConfirmados(boss)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 px-2 py-0.5 rounded-md border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                              title={`Remover todos os confirmados do Boss "${boss.bossName}" (Admin)`}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Remover Confirmados</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRequireAdmin?.('remover confirmados deste Boss')}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                              title="Apenas o Administrador pode remover confirmados (clique para autenticar)"
                            >
                              <Lock className="w-2.5 h-2.5 text-slate-400" />
                              <span>Remover Confirmados</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {bossCheckins.length === 0 ? (
                      <p className="text-[11px] text-[#94a3b8] italic">
                        Nenhum check-in confirmado ainda.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                        {bossCheckins.map((chk) => {
                          const isAuto = isAutoConfirmMember(chk.userName) || chk.isAutoCheckin;
                          const isMe = visitorName && chk.userName.toLowerCase() === visitorName.toLowerCase();
                          return (
                            <span
                              key={chk.id}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1.5 py-0.5 rounded-lg border ${
                                isAuto
                                  ? 'bg-purple-50 text-purple-900 border-purple-200 shadow-2xs font-bold'
                                  : isMe
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                  : 'bg-white text-[#334155] border-[#e2e8f0]'
                              }`}
                            >
                              <CheckCircle2 className={`w-3 h-3 ${isAuto ? 'text-purple-600' : 'text-emerald-600'}`} />
                              <span>{chk.userName}</span>
                              {isAuto && (
                                <span
                                  className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-300 flex items-center gap-0.5"
                                  title="Confirmação Automática Ativa (100% dos Bosses)"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                  Auto
                                </span>
                              )}
                              {(isAdmin || isMe) && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCheckin(chk.id, boss.bossName, chk.userName, boss.id, isAuto)}
                                  className={`ml-0.5 p-0.5 rounded transition-colors cursor-pointer ${
                                    isAuto
                                      ? 'text-purple-400 hover:text-rose-600 hover:bg-rose-50'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-100'
                                  }`}
                                  title={
                                    isAuto
                                      ? `Remover confirmação do auto-checkin de ${chk.userName} deste Boss`
                                      : `Remover check-in de ${chk.userName}`
                                  }
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Re-activate auto-checkin for this boss if removed */}
                    {isAdmin && isAutoCheckinRemoved(boss.id, 'Ella') && (
                      <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-dashed border-purple-300 text-xs">
                        <span className="text-[11px] text-purple-900 font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>Confirmação de auto-checkin de Ella removida deste Boss</span>
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await bossService.restoreAutoCheckinForBoss(boss, 'Ella');
                            onShowToast(`Auto-checkin de Ella reativado para o Boss "${boss.bossName}".`);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 hover:text-purple-950 bg-white hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                          title="Reativar confirmação do auto-checkin de Ella para este Boss"
                        >
                          <Plus className="w-3 h-3 text-purple-600" />
                          <span>Reativar Ella (+{boss.points} pts)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Check-in button + Remover Boss (Admin only) */}
                <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteBoss(boss.id, boss.bossName)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title={`Remover agendamento de ${boss.bossName} (Admin)`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Boss</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequireAdmin?.('remover agendamento de Boss')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                        title="Apenas o Administrador tem permissão para remover Boss (clique para autenticar)"
                      >
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Remover Boss</span>
                      </button>
                    )}
                  </div>

                  {userAlreadyCheckedIn ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Confirmado (+{boss.points} pts)</span>
                      </div>
                      {myCheckinForBoss && (
                        isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveCheckin(myCheckinForBoss.id, boss.bossName, myCheckinForBoss.userName)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="Remover presença deste Boss (Admin)"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Remover Check-in</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRequireAdmin?.('remover presenças confirmadas no Boss')}
                            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                            title="Apenas o Administrador tem permissão para remover confirmados (clique para autenticar)"
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Remover Check-in</span>
                          </button>
                        )
                      )}
                    </div>
                  ) : status.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddBonusToBoss(boss)}
                        disabled={isAddingBonusPoints}
                        className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-xs rounded-xl border border-amber-300 flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title={
                          isAdmin
                            ? `Adicionar +3 pontos aos check-ins já criados deste Boss "${boss.bossName}" (Admin)`
                            : "Apenas o Administrador pode adicionar pontos (clique para autenticar)"
                        }
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                        <span>+3 pts Check-ins</span>
                        {!isAdmin && <Lock className="w-2.5 h-2.5 opacity-75 ml-0.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCheckin(boss)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-900/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Flame className="w-4 h-4 text-emerald-200" />
                        <span>Confirmar Check-in (+{boss.points} pts)</span>
                      </button>
                    </div>
                  ) : status.isUpcoming ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1"
                      title="O check-in só abre a partir do horário marcado do Boss"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Aguardando Horário</span>
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 px-3 py-1.5 bg-slate-100 rounded-xl">
                      Período de 1h Encerrado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Confirm Visitor Check-in */}
      {checkinTargetBoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e2e8f0] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Confirmar Check-in</h3>
                  <p className="text-xs text-emerald-100">Janela de 1h extra ativa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckinTargetBoss(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckin} className="p-5 space-y-4">
              <div className="bg-[#f8fafc] rounded-2xl p-3 border border-[#e2e8f0]">
                <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">
                  Boss Selecionado:
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#131b2e]">
                    {checkinTargetBoss.bossName}
                  </span>
                  <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-xs">
                    +{checkinTargetBoss.points} pts
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1.5">
                  Seu Nome ou Nick de Jogador:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={checkinInputName}
                  onChange={(e) => setCheckinInputName(e.target.value)}
                  placeholder="Ex: Guerreiro_Kael, Thorin, Maria..."
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] focus:border-emerald-600 rounded-xl text-sm font-semibold text-[#131b2e] focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-[#64748b] mt-1">
                  Qualquer visitante pode confirmar presença. Seu nome será somado no <strong>Rank de Pontos</strong>.
                </p>
                {isAutoConfirmMember(checkinInputName) && (
                  <div className="mt-2 p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>O membro <strong>Ella</strong> já possui confirmação automática ativa em todos os Bosses!</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckinTargetBoss(null)}
                  className="px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCheckin || !checkinInputName.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingCheckin ? 'Confirmando...' : 'Confirmar Presença Agora'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New Boss (Admin) */}
      {isNewBossModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e2e8f0] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between bg-[#2a14b4] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Agendar Novo Horário de Boss</h3>
                  <p className="text-xs text-indigo-200">Painel de Agendamento da Guilda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBossModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBossSubmit} className="p-5 space-y-4">
              {/* Presets suggestions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Sugestões Rápidas ({PRESET_BOSSES.length} Bosses):
                  </label>
                  <span className="text-[10px] text-[#94a3b8]">
                    Clique para preencher nome e pontos
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
                  {PRESET_BOSSES.map((preset) => {
                    const isSelected = newBossName === preset.name && newBossPoints === preset.points;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setNewBossName(preset.name);
                          setNewBossCategory(preset.category);
                          setNewBossPoints(preset.points);
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                          isSelected
                            ? 'bg-[#2a14b4] text-white shadow-sm ring-2 ring-[#2a14b4]/30 font-bold'
                            : 'bg-white hover:bg-[#eaedff] text-[#1e293b] hover:text-[#2a14b4] border border-[#cbd5e1]'
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : preset.points >= 5
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : preset.points === 4
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : preset.points === 3
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : preset.points === 2
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          +{preset.points} pts
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Boss Name */}
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Nome do Boss:
                </label>
                <input
                  type="text"
                  required
                  value={newBossName}
                  onChange={(e) => setNewBossName(e.target.value)}
                  placeholder="Ex: Dragão Ancestral do Fogo"
                  className="w-full px-3.5 py-2 text-xs bg-[#f8fafc] border border-[#cbd5e1] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none"
                />
              </div>

              {/* Boss Schedule & Points Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Horário do Boss:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newBossDateTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewBossDateTime(val);
                      // If user hasn't diverged start date, keep synced
                      if (val) {
                        setNewCheckinStartDateTime(val);
                        const d = new Date(val);
                        if (!isNaN(d.getTime())) {
                          const dEnd = new Date(d.getTime() + 60 * 60000);
                          setNewCheckinEndDateTime(
                            new Date(dEnd.getTime() - dEnd.getTimezoneOffset() * 60000)
                              .toISOString()
                              .slice(0, 16)
                          );
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs bg-[#f8fafc] border border-[#cbd5e1] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Pontos do Boss (1 a 100):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      required
                      value={newBossPoints}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (isNaN(val)) setNewBossPoints(1);
                        else setNewBossPoints(Math.min(100, Math.max(1, val)));
                      }}
                      className="w-full px-3.5 py-2 text-xs bg-[#f8fafc] border border-[#cbd5e1] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700">
                      pontos
                    </span>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Categoria:
                </label>
                <select
                  value={newBossCategory}
                  onChange={(e) => setNewBossCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#f8fafc] border border-[#cbd5e1] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="Boss Global">Boss Global</option>
                  <option value="Boss TA2,TA3,TA4">Boss TA2,TA3,TA4</option>
                  <option value="Boss Anonimas 110 / Abadia 118">Boss Anonimas 110 / Abadia 118</option>
                  <option value="Boss de Guilda">Boss de Guilda</option>
                  <option value="Boss Gelo">Boss Gelo</option>
                </select>
              </div>

              {/* Período de Check-in Manual */}
              <div className="bg-[#f8fafc] rounded-2xl p-3.5 border border-[#e2e8f0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2a14b4]" />
                    <span>Período de Check-in Manual:</span>
                  </label>
                  <span className="text-[10px] text-[#64748b]">
                    Ajuste livremente o início e término
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      Início do Check-in:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newCheckinStartDateTime}
                      onChange={(e) => setNewCheckinStartDateTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#cbd5e1] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                      Término do Check-in:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newCheckinEndDateTime}
                      onChange={(e) => setNewCheckinEndDateTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#cbd5e1] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Quick duration presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[#64748b] font-medium mr-1">
                    Atalhos de duração:
                  </span>
                  {[
                    { label: '5min', mins: 5 },
                    { label: '10min', mins: 10 },
                    { label: '15min', mins: 15 },
                    { label: '20min', mins: 20 },
                    { label: '25min', mins: 25 },
                    { label: '30min', mins: 30 },
                  ].map((dur) => (
                    <button
                      key={dur.label}
                      type="button"
                      onClick={() => {
                        const start = new Date(newCheckinStartDateTime || newBossDateTime || Date.now());
                        const end = new Date(start.getTime() + dur.mins * 60000);
                        setNewCheckinEndDateTime(
                          new Date(end.getTime() - end.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        );
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#eaedff] text-[#334155] hover:text-[#2a14b4] border border-[#cbd5e1] transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      +{dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setIsNewBossModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2a14b4] hover:bg-[#200e94] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agendar Boss</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: Delete Boss Confirmation */}
      {bossToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#f1f5f9] flex items-center justify-between bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <h3 className="font-extrabold text-sm">Remover Agendamento do Boss?</h3>
              </div>
              <button
                type="button"
                onClick={() => setBossToDelete(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[#334155] leading-relaxed">
                Tem certeza que deseja remover o agendamento do Boss <strong>"{bossToDelete.name}"</strong>?
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setBossToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBoss}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Sim, Remover Boss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Check-in Confirmation */}
      {checkinToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`bg-white rounded-3xl max-w-sm w-full shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-150 ${
              checkinToDelete.isAuto ? 'border-purple-200' : 'border-rose-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-4 border-b border-[#f1f5f9] flex items-center justify-between text-white ${
                checkinToDelete.isAuto
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700'
                  : 'bg-rose-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {checkinToDelete.isAuto ? (
                  <Sparkles className="w-4 h-4 text-purple-200" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <h3 className="font-extrabold text-sm">
                  {checkinToDelete.isAuto ? 'Remover Confirmação do Auto-Checkin?' : 'Remover Check-in?'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckinToDelete(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[#334155] leading-relaxed">
                {checkinToDelete.isAuto ? (
                  <>
                    Deseja remover a confirmação do auto-checkin de <strong>"{checkinToDelete.userName}"</strong> no Boss <strong>"{checkinToDelete.bossName}"</strong>?
                  </>
                ) : (
                  <>
                    Tem certeza que deseja remover o check-in de <strong>"{checkinToDelete.userName}"</strong> no Boss <strong>"{checkinToDelete.bossName}"</strong>?
                  </>
                )}
              </p>
              <p className="text-[11px] text-[#64748b]">
                {checkinToDelete.isAuto
                  ? 'A presença e os pontos deste Boss serão removidos do ranking. O auto-checkin não será recriado automaticamente para este Boss.'
                  : 'Os pontos serão recalculados e removidos do ranking.'}
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setCheckinToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCheckin}
                  className={`px-4 py-1.5 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer ${
                    checkinToDelete.isAuto
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {checkinToDelete.isAuto ? 'Sim, Remover Confirmação' : 'Sim, Remover Check-in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4B: Remove All Auto-Checkins Confirmation */}
      {isRemoveAllAutoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-purple-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#f1f5f9] flex items-center justify-between bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-200" />
                <h3 className="font-extrabold text-sm">Remover Auto-Checkin em Todos?</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRemoveAllAutoModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[#334155] leading-relaxed">
                Tem certeza que deseja remover as confirmações de auto-checkin de <strong>Ella</strong> de <strong>todos os Bosses</strong> agendados?
              </p>
              <p className="text-[11px] text-[#64748b]">
                As presenças serão retiradas e os pontos zerados. Você poderá restaurá-las a qualquer momento pelo botão "Restaurar Auto-Checkins".
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setIsRemoveAllAutoModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAllAutoCheckins}
                  disabled={isProcessingAutoAction}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isProcessingAutoAction ? 'Removendo...' : 'Sim, Remover de Todos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Clear All Confirmados For Boss Confirmation (Admin only) */}
      {clearBossConfirmadosTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#f1f5f9] flex items-center justify-between bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <h3 className="font-extrabold text-sm">Remover Confirmados?</h3>
              </div>
              <button
                type="button"
                onClick={() => setClearBossConfirmadosTarget(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[#334155] leading-relaxed">
                Tem certeza que deseja remover todos os membros confirmados do Boss <strong>"{clearBossConfirmadosTarget.bossName}"</strong>?
              </p>
              <p className="text-[11px] text-[#64748b]">
                Os pontos distribuídos para os jogadores serão cancelados e recalculados no ranking.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setClearBossConfirmadosTarget(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearBossConfirmados}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Sim, Remover Confirmados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

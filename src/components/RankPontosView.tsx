import React, { useState } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Search,
  CheckCircle2,
  Calendar,
  Share2,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Swords,
  Flame,
  User,
  AlertTriangle,
  X,
  Trash2,
  Lock,
  Shield,
  Sparkles,
} from 'lucide-react';
import { BossEvent, BossCheckin, UserRankEntry } from '../types/shopping';
import {
  bossService,
  isAutoConfirmMember,
  getRemovedAutoCheckins,
} from '../services/bossService';
import { playHapticSound } from '../utils/helpers';

interface RankPontosViewProps {
  checkins: BossCheckin[];
  bossEvents?: BossEvent[];
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
  onNavigateToCheckin: () => void;
  onShowToast: (msg: string) => void;
}

export const RankPontosView: React.FC<RankPontosViewProps> = ({
  checkins,
  bossEvents,
  isAdmin = false,
  onRequireAdmin,
  onNavigateToCheckin,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Compute live ranking from check-ins
  const rankingList = bossService.computeRank(checkins);

  // Filter ranking by search term
  const filteredRanking = rankingList.filter((entry) =>
    entry.userName.toLowerCase().includes(search.trim().toLowerCase())
  );

  // Total points and checkins across all members
  const grandTotalPoints = checkins.reduce((acc, c) => acc + c.points, 0);
  const totalParticipants = rankingList.length;

  // Copy formatted rank text for Discord / WhatsApp
  const handleCopyRank = () => {
    if (rankingList.length === 0) {
      onShowToast('Nenhum dado no ranking para copiar.');
      return;
    }

    let text = `🏆 *RANK DE PONTOS DE BOSS* 🏆\n`;
    text += `Gestão de Craft • Atualizado em ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    rankingList.forEach((entry, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
      text += `${medal} *${entry.userName}* — ${entry.totalPoints} pts (${entry.totalCheckins} bosses)\n`;
    });

    text += `\nTotal: ${totalParticipants} participantes • ${grandTotalPoints} pts distribuídos.`;

    navigator.clipboard.writeText(text);
    playHapticSound('toggle');
    setCopied(true);
    onShowToast('Rank copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Reset Season Checkins (Admin only)
  const handleOpenResetModal = () => {
    if (!isAdmin) {
      onRequireAdmin?.('zerar o Rank de Pontos da guilda');
      return;
    }
    setIsResetModalOpen(true);
  };

  const handleConfirmResetSeason = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('zerar o Rank de Pontos da guilda');
      return;
    }
    try {
      setIsResetting(true);
      await bossService.resetAllCheckins();
      playHapticSound('delete');
      onShowToast('Rank de Pontos zerado com sucesso para a nova temporada!');
    } catch (err) {
      console.error('Erro ao zerar rank:', err);
      onShowToast('Erro ao zerar rank de pontos.');
    } finally {
      setIsResetting(false);
      setIsResetModalOpen(false);
    }
  };

  // Delete Check-in from confirmed presences (Admin only)
  const [checkinToDelete, setCheckinToDelete] = useState<{
    id: string;
    userName: string;
    bossName: string;
    points: number;
    bossId?: string;
    isAuto?: boolean;
  } | null>(null);
  const [isDeletingCheckin, setIsDeletingCheckin] = useState(false);
  const [isRemoveAllAutoModalOpen, setIsRemoveAllAutoModalOpen] = useState(false);
  const [isProcessingAutoAction, setIsProcessingAutoAction] = useState(false);

  const handlePromptDeleteCheckin = (chk: BossCheckin, userName: string) => {
    if (!isAdmin) {
      onRequireAdmin?.('remover o check-in das presenças confirmadas no Rank');
      return;
    }
    const isAuto = isAutoConfirmMember(userName) || chk.isAutoCheckin;
    setCheckinToDelete({
      id: chk.id,
      userName,
      bossName: chk.bossName,
      points: chk.points,
      bossId: chk.bossId,
      isAuto,
    });
  };

  const handleConfirmDeleteCheckin = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('remover o check-in das presenças confirmadas no Rank');
      return;
    }
    if (!checkinToDelete) return;
    try {
      setIsDeletingCheckin(true);
      await bossService.deleteCheckin(
        checkinToDelete.id,
        checkinToDelete.bossId,
        checkinToDelete.userName
      );
      playHapticSound('delete');
      if (checkinToDelete.isAuto) {
        onShowToast(
          `Confirmação do auto-checkin de "${checkinToDelete.userName}" no Boss "${checkinToDelete.bossName}" removida (-${checkinToDelete.points} pts).`
        );
      } else {
        onShowToast(
          `Presença de "${checkinToDelete.userName}" no Boss "${checkinToDelete.bossName}" removida com sucesso (-${checkinToDelete.points} pts).`
        );
      }
      setCheckinToDelete(null);
    } catch (err) {
      console.error('Erro ao remover check-in:', err);
      onShowToast('Erro ao remover check-in do banco de dados.');
    } finally {
      setIsDeletingCheckin(false);
    }
  };

  const handleRemoveAllAutoCheckins = async () => {
    if (!isAdmin) {
      onRequireAdmin?.('remover confirmações do auto-checkin');
      return;
    }
    try {
      setIsProcessingAutoAction(true);
      await bossService.removeAllAutoCheckins('Ella');
      playHapticSound('delete');
      onShowToast('Todas as confirmações de auto-checkin de Ella foram removidas.');
      setIsRemoveAllAutoModalOpen(false);
    } catch {
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
    } catch {
      onShowToast('Erro ao restaurar auto-checkins.');
    } finally {
      setIsProcessingAutoAction(false);
    }
  };

  // Top 3 for Podium
  const top1 = rankingList[0];
  const top2 = rankingList[1];
  const top3 = rankingList[2];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-1">
            <span>Gestão de Craft</span>
            <span>&gt;</span>
            <span className="text-[#131b2e] font-bold">Rank de Pontos</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight font-display flex items-center gap-2.5">
              <span>Rank de Pontos</span>
            </h1>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              Classificação Geral
            </span>
            {!isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-500" />
                Modo Leitura
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <Shield className="w-3 h-3 text-rose-600" />
                Painel Admin
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748b] mt-1 max-w-2xl">
            Tabela com o <strong>total de pontos</strong> e o <strong>nome de cada pessoa</strong>, somados
            automaticamente a cada check-in de Boss confirmado.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onNavigateToCheckin}
            className="px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Swords className="w-4 h-4" />
            <span>Fazer Check-in</span>
          </button>

          <button
            type="button"
            onClick={handleCopyRank}
            className="px-3.5 py-2 bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] text-[#334155] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Copiar texto formatado com posições para WhatsApp ou Discord"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#2a14b4]" />
                <span>Copiar Rank</span>
              </>
            )}
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={handleOpenResetModal}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              title="Zerar Rank para Nova Temporada (Admin)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zerar Rank</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRequireAdmin?.('zerar o Rank de Pontos')}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Apenas o Administrador pode zerar o Rank (clique para autenticar)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Zerar Rank</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold">Total de Pontos</span>
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-display">
            {grandTotalPoints.toLocaleString()} <span className="text-xs font-semibold text-amber-700">pts</span>
          </div>
          <p className="text-[10px] text-amber-800 mt-0.5">
            Distribuídos em check-ins
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold">Participantes</span>
            <User className="w-4 h-4 text-[#2a14b4]" />
          </div>
          <div className="text-2xl font-black text-[#131b2e] font-display">
            {totalParticipants}
          </div>
          <p className="text-[10px] text-[#64748b] mt-0.5">
            Pessoas no ranking
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold">Presenças Confirmadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#131b2e] font-display">
            {checkins.length}
          </div>
          <p className="text-[10px] text-[#64748b] mt-0.5">
            Check-ins realizados
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold">Líder do Rank</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-[#131b2e] truncate font-display">
            {top1 ? top1.userName : 'Nenhum'}
          </div>
          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
            {top1 ? `${top1.totalPoints} pontos` : 'Aguardando check-in'}
          </p>
        </div>
      </div>

      {/* Podium Section (Top 3) */}
      {rankingList.length > 0 && (
        <div className="bg-gradient-to-b from-[#faf8ff] to-white rounded-3xl border border-[#eaedff] p-5 sm:p-6 shadow-xs">
          <div className="text-center mb-5">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#2a14b4]">
              Pódio dos Campeões
            </h2>
            <p className="text-sm font-bold text-[#131b2e] mt-0.5">
              Os 3 membros com mais pontos acumulados em Bosses
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-2xl mx-auto">
            {/* 2º Lugar - Silver */}
            <div className="order-2 sm:order-1 bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-lg mb-2 shadow-2xs border border-slate-300">
                🥈
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                2º Lugar
              </div>
              <div className="font-extrabold text-base text-[#131b2e] truncate max-w-[150px] flex items-center justify-center gap-1">
                <span>{top2 ? top2.userName : '—'}</span>
                {top2 && isAutoConfirmMember(top2.userName) && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-300" title="Confirmação Automática">Auto</span>
                )}
              </div>
              <div className="text-sm font-black text-[#2a14b4] mt-1">
                {top2 ? `${top2.totalPoints} pts` : '—'}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">
                {top2 ? `${top2.totalCheckins} bosses` : ''}
              </div>
            </div>

            {/* 1º Lugar - Gold */}
            <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-50 to-white rounded-2xl border-2 border-amber-400 p-5 text-center shadow-md flex flex-col items-center sm:-translate-y-2">
              <div className="relative mb-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center font-black text-2xl shadow-md border-2 border-amber-300">
                  🥇
                </div>
                <Crown className="w-5 h-5 text-amber-500 absolute -top-3 -right-2 drop-shadow" />
              </div>
              <div className="text-xs font-extrabold text-amber-800 uppercase tracking-wider mb-0.5">
                1º Lugar Geral
              </div>
              <div className="font-black text-lg text-[#131b2e] truncate max-w-[170px] flex items-center justify-center gap-1">
                <span>{top1 ? top1.userName : '—'}</span>
                {top1 && isAutoConfirmMember(top1.userName) && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-300" title="Confirmação Automática">Auto</span>
                )}
              </div>
              <div className="text-base font-black text-amber-900 mt-1">
                {top1 ? `${top1.totalPoints} pts` : '—'}
              </div>
              <div className="text-xs text-amber-800 font-semibold mt-0.5">
                {top1 ? `${top1.totalCheckins} presenças` : ''}
              </div>
            </div>

            {/* 3º Lugar - Bronze */}
            <div className="order-3 bg-white rounded-2xl border border-amber-200/80 p-4 text-center shadow-xs flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-lg mb-2 shadow-2xs border border-amber-300">
                🥉
              </div>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">
                3º Lugar
              </div>
              <div className="font-extrabold text-base text-[#131b2e] truncate max-w-[150px] flex items-center justify-center gap-1">
                <span>{top3 ? top3.userName : '—'}</span>
                {top3 && isAutoConfirmMember(top3.userName) && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-300" title="Confirmação Automática">Auto</span>
                )}
              </div>
              <div className="text-sm font-black text-[#2a14b4] mt-1">
                {top3 ? `${top3.totalPoints} pts` : '—'}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">
                {top3 ? `${top3.totalCheckins} bosses` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Ranking Table Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        {/* Search header inside card */}
        <div className="p-4 sm:p-5 border-b border-[#f1f5f9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-base text-[#131b2e]">
              Lista do Rank de Pontos
            </h3>
            <p className="text-xs text-[#64748b]">
              Classificação detalhada de cada pessoa e histórico de presenças
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jogador no rank..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] rounded-xl text-[#131b2e] focus:outline-none"
            />
          </div>
        </div>

        {/* List of Persons with Total Points */}
        {filteredRanking.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Trophy className="w-10 h-10 text-[#94a3b8] mx-auto opacity-50" />
            <h4 className="font-bold text-sm text-[#131b2e]">
              Nenhum jogador encontrado no Rank
            </h4>
            <p className="text-xs text-[#64748b] max-w-sm mx-auto">
              {search
                ? 'Nenhuma pessoa coincide com sua busca.'
                : 'Ainda não há check-ins registrados. Vá até a aba "Check-in" e confirme sua presença no Boss ativo!'}
            </p>
            <button
              type="button"
              onClick={onNavigateToCheckin}
              className="mt-3 px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Ir para Check-in de Boss</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {filteredRanking.map((entry, index) => {
              const position = index + 1;
              const isExpanded = expandedUser === entry.userName;
              const isTop1 = position === 1;
              const isTop2 = position === 2;
              const isTop3 = position === 3;

              return (
                <div
                  key={entry.userName}
                  className={`p-3.5 sm:p-4 transition-colors ${
                    isTop1
                      ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : isTop2
                      ? 'bg-slate-50/50 hover:bg-slate-50'
                      : isTop3
                      ? 'bg-amber-50/20 hover:bg-amber-50/40'
                      : 'hover:bg-[#faf8ff]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Position + Avatar + Name + Check-ins count */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Position Badge */}
                      <div className="shrink-0 w-8 text-center font-black text-sm">
                        {isTop1 ? (
                          <span className="text-xl">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-xl">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-xl">🥉</span>
                        ) : (
                          <span className="text-[#64748b] font-bold">#{position}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border ${
                          isTop1
                            ? 'bg-amber-400 text-amber-950 border-amber-300'
                            : isTop2
                            ? 'bg-slate-200 text-slate-800 border-slate-300'
                            : isTop3
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : 'bg-[#eaedff] text-[#2a14b4] border-[#c7d2fe]'
                        }`}
                      >
                        {entry.userName.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Name & Quick Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-[#131b2e] truncate">
                            {entry.userName}
                          </span>
                          {isAutoConfirmMember(entry.userName) && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded shadow-2xs"
                              title="Confirmação Automática Ativa em todos os Bosses"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                              Auto-checkin
                            </span>
                          )}
                          {isTop1 && (
                            <span className="hidden sm:inline-flex text-[9px] font-extrabold bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded shadow-2xs">
                              LÍDER
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#64748b]">
                          <span>{entry.totalCheckins} {entry.totalCheckins === 1 ? 'boss' : 'bosses'} confirmados</span>
                          <span>•</span>
                          <span className="text-[11px]">
                            Último: {new Date(entry.lastCheckinAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total Points + Expand Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Total Points Pill */}
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-300 shadow-2xs">
                          <Trophy className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-black text-sm sm:text-base text-amber-950 tabular-nums">
                            {entry.totalPoints}
                          </span>
                          <span className="text-[11px] font-bold text-amber-800">
                            pts
                          </span>
                        </div>
                      </div>

                      {/* Expand Button for details */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedUser(isExpanded ? null : entry.userName)
                        }
                        className="p-1.5 text-[#64748b] hover:text-[#131b2e] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                        title="Ver histórico de Bosses desta pessoa"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: History of check-ins for this person */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0]/60 pl-3 sm:pl-11 pr-2 animate-in fade-in duration-150">
                      {isAutoConfirmMember(entry.userName) && (
                        <div className="mb-2.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>
                              Membro com <strong className="font-extrabold text-purple-950">auto-checkin</strong> em Bosses agendados.
                            </span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                              {getRemovedAutoCheckins().length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleRestoreAllAutoCheckins}
                                  disabled={isProcessingAutoAction}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3 text-purple-600" />
                                  <span>Restaurar Auto-Checkins</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsRemoveAllAutoModalOpen(true)}
                                disabled={isProcessingAutoAction}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                title="Remover confirmação do auto-checkin de Ella em todos os Bosses"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remover de Todos</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                        <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                          Presenças Confirmadas ({entry.checkins.length}):
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {entry.checkins.map((chk) => (
                          <div
                            key={chk.id}
                            className="flex items-center justify-between text-xs bg-white rounded-xl p-2 px-3 border border-[#e2e8f0] hover:border-[#cbd5e1] transition-all gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-[#131b2e] truncate">
                                {chk.bossName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[11px] text-[#64748b] hidden sm:inline">
                                {new Date(chk.checkedInAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                                +{chk.points} pts
                              </span>

                              {/* Remover Check-in (Apenas Administrador) */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handlePromptDeleteCheckin(chk, entry.userName)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title={
                                    isAutoConfirmMember(entry.userName)
                                      ? `Remover confirmação do auto-checkin de ${entry.userName} no Boss ${chk.bossName}`
                                      : `Remover presença de ${entry.userName} no Boss ${chk.bossName} (Admin)`
                                  }
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>{isAutoConfirmMember(entry.userName) ? 'Remover Auto' : 'Remover'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Reset Season Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between bg-rose-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Zerar Rank de Pontos?</h3>
                  <p className="text-xs text-rose-100">Gestão da Temporada da Guilda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Atenção: Ação Irreversível</strong>
                  <span>
                    Todos os check-ins registrados serão apagados e o pódio será zerado para iniciar uma nova temporada da guilda.
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#64748b] leading-relaxed">
                Tem certeza que deseja zerar a pontuação de todos os <strong>{totalParticipants}</strong> participantes?
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleConfirmResetSeason}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isResetting ? 'Zerando...' : 'Sim, Zerar Temporada'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Check-in Confirmation Modal (Admin) */}
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
                {checkinToDelete.isAuto ? <Sparkles className="w-4 h-4 text-purple-200" /> : <Trash2 className="w-4 h-4" />}
                <h3 className="font-extrabold text-sm">
                  {checkinToDelete.isAuto ? 'Remover Confirmação do Auto-Checkin?' : 'Remover Presença Confirmada?'}
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
                    Deseja remover a confirmação do auto-checkin de{' '}
                    <strong className="text-[#131b2e] font-extrabold">{checkinToDelete.userName}</strong> no Boss{' '}
                    <strong className="text-[#131b2e] font-extrabold">"{checkinToDelete.bossName}"</strong>?
                  </>
                ) : (
                  <>
                    Tem certeza que deseja remover o check-in de{' '}
                    <strong className="text-[#131b2e] font-extrabold">{checkinToDelete.userName}</strong> no Boss{' '}
                    <strong className="text-[#131b2e] font-extrabold">"{checkinToDelete.bossName}"</strong>?
                  </>
                )}
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 font-medium">
                Serão subtraídos <strong>+{checkinToDelete.points} pontos</strong> deste jogador no Rank de Pontos.
                {checkinToDelete.isAuto && (
                  <span className="block mt-1 text-purple-900">
                    O auto-checkin não será recriado automaticamente para este Boss.
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setCheckinToDelete(null)}
                  disabled={isDeletingCheckin}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCheckin}
                  disabled={isDeletingCheckin}
                  className={`px-4 py-1.5 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                    checkinToDelete.isAuto
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {isDeletingCheckin
                      ? 'Removendo...'
                      : checkinToDelete.isAuto
                      ? 'Sim, Remover Confirmação'
                      : 'Sim, Remover Check-in'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Remove All Auto-Checkins Modal */}
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
                Tem certeza que deseja remover as confirmações de auto-checkin de <strong>Ella</strong> de <strong>todos os Bosses</strong>?
              </p>
              <p className="text-[11px] text-[#64748b]">
                Os pontos de todos os bosses serão zerados para ela. Você poderá restaurá-los a qualquer momento pelo botão "Restaurar Auto-Checkins".
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
    </div>
  );
};

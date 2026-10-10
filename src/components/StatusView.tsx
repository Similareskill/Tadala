import React, { useState, useMemo } from 'react';
import {
  Shield,
  Swords,
  Crosshair,
  Zap,
  Sparkles,
  Lock,
  KeyRound,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Trophy,
  UserCheck,
  ShieldCheck,
  X,
  FileSpreadsheet,
  Wallet,
  Image as ImageIcon,
  ExternalLink,
  Calculator,
} from 'lucide-react';
import { MemberStatus } from '../types/shopping';
import { statusService } from '../services/statusService';
import { activityLogService } from '../services/activityLogService';
import { playHapticSound, formatRelativeTime } from '../utils/helpers';

interface StatusViewProps {
  statuses: MemberStatus[];
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onRequireAdmin: (reason: string) => boolean;
  onShowToast: (msg: string) => void;
  currentUserName?: string | null;
}

const CLASS_OPTIONS = [
  'Espadão',
  'Lanceiro',
  'Espada Escudo',
  'Dual',
  'Luva',
  'Arqueiro',
  'Assassino',
  'Rapieira',
  'Mago',
  'Healer',
  'Orbe',
  'Canhão',
];

export const StatusView: React.FC<StatusViewProps> = ({
  statuses,
  isAdmin,
  onOpenAdminLogin,
  onRequireAdmin,
  onShowToast,
  currentUserName,
}) => {
  // Member Form State
  const initialName = () => {
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

  const [formMemberName, setFormMemberName] = useState(initialName);
  const [formLevel, setFormLevel] = useState<string>('');
  const [formClasse, setFormClasse] = useState('Espadão');
  const [formDano, setFormDano] = useState<string>('');
  const [formDefesa, setFormDefesa] = useState<string>('');
  const [formAcerto, setFormAcerto] = useState<string>('');
  const [formPower, setFormPower] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formImgurUrl, setFormImgurUrl] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminAddModal, setShowAdminAddModal] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Admin filter & search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'power' | 'level' | 'dano' | 'defesa' | 'acerto' | 'media' | 'nome' | 'data'>('power');

  // Find current user's existing status if any
  const myExistingStatus = useMemo(() => {
    if (!formMemberName.trim()) return null;
    const clean = formMemberName.trim().toLowerCase();
    return statuses.find((s) => s.memberName.trim().toLowerCase() === clean) || null;
  }, [statuses, formMemberName]);

  // Load user's saved status into the form
  const handleLoadExistingStatus = (st: MemberStatus) => {
    setFormMemberName(st.memberName);
    setFormLevel(st.level ? String(st.level) : '');
    setFormClasse(st.classe || 'Espadão');
    setFormDano(st.dano ? String(st.dano) : '');
    setFormDefesa(st.defesa ? String(st.defesa) : '');
    setFormAcerto(st.acerto ? String(st.acerto) : '');
    setFormPower(st.power ? String(st.power) : '');
    setFormNotes(st.notes || '');
    setFormImgurUrl(st.imgurUrl || '');
    setEditingStatusId(st.id);
    playHapticSound('toggle');
    onShowToast(`Dados de "${st.memberName}" carregados no formulário!`);
  };

  // Submit / Update status
  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formMemberName.trim();
    if (!cleanName) {
      onShowToast('Por favor, informe o seu Nome ou Nickname.');
      return;
    }

    const levelNum = formLevel.trim() ? Number(formLevel) : undefined;
    const danoNum = Number(formDano) || 0;
    const defesaNum = Number(formDefesa) || 0;
    const acertoNum = Number(formAcerto) || 0;
    const powerNum = Number(formPower) || 0;
    const mediaNum = (acertoNum > 0 || defesaNum > 0) ? (acertoNum + defesaNum) / 2 : undefined;

    if (danoNum === 0 && defesaNum === 0 && acertoNum === 0 && powerNum === 0 && !levelNum && !formImgurUrl.trim()) {
      onShowToast('Informe ao menos um valor de Status (Level, Dano, Defesa, Acerto, Power ou Link do Imgur).');
      return;
    }

    setIsSubmitting(true);
    playHapticSound('toggle');

    try {
      // Save player nickname locally for convenience
      try {
        localStorage.setItem('craft_player_nickname', cleanName);
      } catch {}

      const existing = statuses.find(
        (s) => s.memberName.trim().toLowerCase() === cleanName.toLowerCase()
      );

      const targetId = editingStatusId || existing?.id || `status-${Date.now()}`;

      const newOrUpdatedStatus: MemberStatus = {
        id: targetId,
        memberName: cleanName,
        level: levelNum,
        classe: formClasse,
        dano: danoNum,
        defesa: defesaNum,
        acerto: acertoNum,
        power: powerNum,
        media: mediaNum,
        notes: formNotes.trim() || undefined,
        imgurUrl: formImgurUrl.trim() || undefined,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await statusService.saveStatus(newOrUpdatedStatus);
      activityLogService.log({
        type: 'status_update',
        title: existing ? 'Status de Combate Atualizado' : 'Novo Status de Combate Cadastrado',
        description: `${cleanName}: Power ${powerNum.toLocaleString('pt-BR')} | Acerto ${acertoNum.toLocaleString('pt-BR')} | Defesa ${defesaNum.toLocaleString('pt-BR')} | Média ${(mediaNum ?? 0).toLocaleString('pt-BR')}`,
        userName: cleanName,
        userRole: isAdmin ? 'admin' : 'membro',
      });
      onShowToast(`Status de "${cleanName}" salvo com sucesso!`);
      setEditingStatusId(null);
      setShowAdminAddModal(false);
    } catch (err) {
      console.error('Error saving status:', err);
      onShowToast('Não foi possível salvar o status no momento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin delete status
  const handleDeleteStatus = (id: string, name: string) => {
    if (!onRequireAdmin('Apenas administradores podem excluir registros de status.')) return;
    setStatusToDelete({ id, name });
  };

  const handleConfirmDeleteStatus = async () => {
    if (!statusToDelete) return;
    try {
      await statusService.deleteStatus(statusToDelete.id);
      playHapticSound('delete');
      activityLogService.log({
        type: 'status_update',
        title: 'Status de Combate Excluído',
        description: `O status de combate do membro "${statusToDelete.name}" foi removido por Administrador.`,
        userName: 'Administrador',
        userRole: 'admin',
      });
      onShowToast(`Status de "${statusToDelete.name}" excluído.`);
      setStatusToDelete(null);
    } catch (e) {
      console.error('Error deleting status:', e);
      onShowToast('Erro ao excluir status.');
    }
  };

  // Filtered & Sorted Statuses for Admin
  const filteredStatuses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = statuses.filter((st) => {
      if (!q) return true;
      return (
        st.memberName.toLowerCase().includes(q) ||
        (st.classe && st.classe.toLowerCase().includes(q)) ||
        (st.notes && st.notes.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'power') return (b.power || 0) - (a.power || 0);
      if (sortBy === 'level') return (b.level || 0) - (a.level || 0);
      if (sortBy === 'dano') return (b.dano || 0) - (a.dano || 0);
      if (sortBy === 'defesa') return (b.defesa || 0) - (a.defesa || 0);
      if (sortBy === 'acerto') return (b.acerto || 0) - (a.acerto || 0);
      if (sortBy === 'media') {
        const mA = typeof a.media === 'number' ? a.media : ((a.acerto || 0) + (a.defesa || 0)) / 2;
        const mB = typeof b.media === 'number' ? b.media : ((b.acerto || 0) + (b.defesa || 0)) / 2;
        return mB - mA;
      }
      if (sortBy === 'nome') return a.memberName.localeCompare(b.memberName);
      if (sortBy === 'data') {
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
      return 0;
    });

    return result;
  }, [statuses, searchQuery, sortBy]);

  // Bulk selection computed states
  const visibleSelectedCount = useMemo(() => {
    return filteredStatuses.filter((s) => selectedStatusIds.has(s.id)).length;
  }, [filteredStatuses, selectedStatusIds]);

  const allVisibleSelected = filteredStatuses.length > 0 && visibleSelectedCount === filteredStatuses.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const handleToggleSelectStatus = (id: string) => {
    playHapticSound('toggle');
    setSelectedStatusIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    playHapticSound('toggle');
    const visibleIds = filteredStatuses.map((s) => s.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStatusIds.has(id));
    if (allSelected) {
      setSelectedStatusIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedStatusIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    playHapticSound('click');
    setSelectedStatusIds(new Set());
  };

  const handlePromptBulkDelete = () => {
    if (!onRequireAdmin('Apenas administradores podem excluir registros de status.')) return;
    if (selectedStatusIds.size === 0) {
      onShowToast('Nenhum membro selecionado para exclusão.');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!onRequireAdmin('Apenas administradores podem excluir registros de status.')) return;
    const count = selectedStatusIds.size;
    if (count === 0) return;

    setIsBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedStatusIds);
      await statusService.deleteMultipleStatuses(idsToDelete);
      playHapticSound('delete');
      activityLogService.log({
        type: 'status_update',
        title: 'Múltiplos Status de Combate Excluídos',
        description: `${count} registro(s) de membros foram removidos do quadro pelo Administrador.`,
        userName: 'Administrador',
        userRole: 'admin',
      });
      onShowToast(`${count} registro(s) de status removido(s) com sucesso.`);
      setSelectedStatusIds(new Set());
      setShowBulkDeleteModal(false);
    } catch (err) {
      console.error('Error deleting statuses:', err);
      onShowToast('Erro ao excluir registros selecionados.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Admin KPI metrics
  const totalMembers = statuses.length;
  const avgPower = useMemo(() => {
    if (totalMembers === 0) return 0;
    const sum = statuses.reduce((acc, s) => acc + (s.power || 0), 0);
    return Math.round(sum / totalMembers);
  }, [statuses, totalMembers]);

  const maxDano = useMemo(() => {
    if (totalMembers === 0) return 0;
    return Math.max(...statuses.map((s) => s.dano || 0));
  }, [statuses, totalMembers]);

  const avgDefesa = useMemo(() => {
    if (totalMembers === 0) return 0;
    const sum = statuses.reduce((acc, s) => acc + (s.defesa || 0), 0);
    return Math.round(sum / totalMembers);
  }, [statuses, totalMembers]);

  const avgMedia = useMemo(() => {
    if (totalMembers === 0) return 0;
    const sum = statuses.reduce((acc, s) => acc + ((s.acerto || 0) + (s.defesa || 0)) / 2, 0);
    return Math.round(sum / totalMembers);
  }, [statuses, totalMembers]);

  // Export CSV for Admin
  const handleExportCSV = () => {
    if (statuses.length === 0) {
      onShowToast('Nenhum dado para exportar.');
      return;
    }
    const headers = ['Posição', 'Membro', 'Level', 'Classe', 'Dano', 'Defesa', 'Acerto', 'Média (Acerto+Def/2)', 'Power', 'Atualizado em', 'Carteira', 'Link Imgur'];
    const rows = filteredStatuses.map((st, idx) => {
      const mediaVal = ((st.acerto || 0) + (st.defesa || 0)) / 2;
      return [
        idx + 1,
        `"${st.memberName}"`,
        st.level || '',
        `"${st.classe || ''}"`,
        st.dano,
        st.defesa,
        st.acerto,
        mediaVal > 0 ? mediaVal.toFixed(2).replace('.', ',') : '-',
        st.power,
        `"${new Date(st.updatedAt).toLocaleString('pt-BR')}"`,
        `"${(st.notes || '').replace(/"/g, '""')}"`,
        `"${(st.imgurUrl || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `status_guilda_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Relatório CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#200e94] via-[#2a14b4] to-[#4338ca] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-950/15 relative overflow-hidden">
        {/* Glow background decorations */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-indigo-100 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Painel de Estatísticas & Poder</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
              Status da Guilda
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Membros podem preencher e atualizar seu <strong>Level</strong>, <strong>Dano</strong>,{' '}
              <strong>Defesa</strong>, <strong>Acerto</strong> e <strong>Power</strong>.
            </p>
          </div>

          {/* Admin vs Member pill */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {isAdmin ? (
              <div className="flex items-center gap-2.5 bg-amber-400/20 border border-amber-300/40 backdrop-blur-md px-4 py-2.5 rounded-2xl text-amber-200">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Modo Administrador</span>
                    <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded font-black">
                      VER TUDO
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-200/90">
                    Você tem acesso total para ver todas as informações.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Lock className="w-4 h-4 text-indigo-200" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Modo Membro</span>
                    <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-semibold">
                      Preenchimento
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-200">
                    A visualização geral é restrita aos administradores.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="ml-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
                  title="Fazer login como Administrador"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Login Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: MEMBER STATUS FORM (Always accessible so ANY member can fill & update) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#e2e8f0] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#2a14b4] flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#131b2e] font-display">
                  {editingStatusId ? 'Atualizar Meus Status' : 'Preencher Meus Status'}
                </h2>
                <p className="text-xs text-[#64748b]">
                  Informe os valores atuais do seu personagem para o registro da guilda.
                </p>
              </div>
            </div>

            {myExistingStatus && !editingStatusId && (
              <button
                type="button"
                onClick={() => handleLoadExistingStatus(myExistingStatus)}
                className="text-xs font-bold text-[#2a14b4] hover:text-[#200e94] bg-[#f2f3ff] hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Carregar Meus Dados</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitStatus} className="space-y-5">
            {/* Row 1: Name, Level and Class */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-[#1e293b] mb-1.5">
                  Nome do Membro / Nickname <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formMemberName}
                    onChange={(e) => setFormMemberName(e.target.value)}
                    placeholder="Ex: Ella, Thorin, Zephyr..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] focus:border-transparent transition-all"
                  />
                  {formMemberName && (
                    <span className="absolute right-3 top-2.5 text-emerald-600 text-xs font-bold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-[#1e293b] mb-1.5 flex items-center justify-between">
                  <span>Level (Nível)</span>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    Lv.
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  placeholder="Ex: 110"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] focus:border-transparent font-bold text-[#131b2e] tabular-nums"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-[#1e293b] mb-1.5">
                  Classe
                </label>
                <select
                  value={formClasse}
                  onChange={(e) => setFormClasse(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] focus:border-transparent bg-white transition-all cursor-pointer"
                >
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: The 4 Core Stats requested: Dano, Defesa, Acerto, Power */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* DANO */}
              <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-3.5 focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-transparent transition-all">
                <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold mb-1.5">
                  <Swords className="w-3.5 h-3.5" />
                  <span>DANO</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formDano}
                  onChange={(e) => setFormDano(e.target.value)}
                  placeholder="Ex: 18500"
                  className="w-full text-base sm:text-lg font-extrabold text-rose-950 bg-transparent focus:outline-none placeholder:text-rose-300 tabular-nums"
                />
                <span className="text-[10px] text-rose-600/80 font-medium block mt-1">Ataque base</span>
              </div>

              {/* DEFESA */}
              <div className="bg-sky-50/60 border border-sky-200/80 rounded-2xl p-3.5 focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent transition-all">
                <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold mb-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>DEFESA</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formDefesa}
                  onChange={(e) => setFormDefesa(e.target.value)}
                  placeholder="Ex: 12400"
                  className="w-full text-base sm:text-lg font-extrabold text-sky-950 bg-transparent focus:outline-none placeholder:text-sky-300 tabular-nums"
                />
                <span className="text-[10px] text-sky-600/80 font-medium block mt-1">Armadura / Res</span>
              </div>

              {/* ACERTO */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>ACERTO</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formAcerto}
                  onChange={(e) => setFormAcerto(e.target.value)}
                  placeholder="Ex: 98.5"
                  className="w-full text-base sm:text-lg font-extrabold text-emerald-950 bg-transparent focus:outline-none placeholder:text-emerald-300 tabular-nums"
                />
                <span className="text-[10px] text-emerald-600/80 font-medium block mt-1">Precisão / Hit</span>
              </div>

              {/* POWER */}
              <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-3.5 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent transition-all">
                <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>POWER</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formPower}
                  onChange={(e) => setFormPower(e.target.value)}
                  placeholder="Ex: 75000"
                  className="w-full text-base sm:text-lg font-extrabold text-amber-950 bg-transparent focus:outline-none placeholder:text-amber-300 tabular-nums"
                />
                <span className="text-[10px] text-amber-700/80 font-medium block mt-1">Poder total</span>
              </div>
            </div>

            {/* Média (Acerto + Defesa ÷ 2) em tempo real */}
            {(Number(formAcerto) > 0 || Number(formDefesa) > 0) && (
              <div className="bg-gradient-to-r from-violet-50 via-purple-50/70 to-indigo-50/60 border border-violet-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-violet-950 flex items-center gap-1.5">
                      <span>Média Calculada</span>
                      <span className="text-[10px] bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded font-extrabold uppercase">
                        (Acerto + Defesa) ÷ 2
                      </span>
                    </div>
                    <div className="text-[11px] text-violet-700 font-medium">
                      ({Number(formAcerto) || 0} + {Number(formDefesa) || 0}) ÷ 2
                    </div>
                  </div>
                </div>
                <div className="text-xl font-black text-violet-950 tabular-nums">
                  {(((Number(formAcerto) || 0) + (Number(formDefesa) || 0)) / 2).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Carteira e Link Imgur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Carteira */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#2a14b4]" />
                  <span>Carteira</span>
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Endereço da carteira ou chave (Ex: 0x...)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] focus:border-transparent font-mono text-xs text-[#1e293b]"
                />
              </div>

              {/* Link Imgur */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#64748b] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Link do Imgur (Print do Status)</span>
                  </label>
                  <a
                    href="https://imgur.com/upload"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors flex items-center gap-1"
                    title="Abrir imgur.com para fazer upload do print"
                  >
                    <span>Subir no Imgur</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={formImgurUrl}
                    onChange={(e) => setFormImgurUrl(e.target.value)}
                    placeholder="https://imgur.com/... ou https://i.imgur.com/..."
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] focus:border-transparent text-xs text-[#1e293b] pr-8"
                  />
                  {formImgurUrl && (
                    <a
                      href={formImgurUrl.startsWith('http') ? formImgurUrl : `https://${formImgurUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 p-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-md text-xs cursor-pointer"
                      title="Abrir link do Imgur em nova aba"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {editingStatusId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingStatusId(null);
                    setFormLevel('');
                    setFormDano('');
                    setFormDefesa('');
                    setFormAcerto('');
                    setFormPower('');
                    setFormNotes('');
                    setFormImgurUrl('');
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto px-6 py-3 bg-[#2a14b4] hover:bg-[#200e94] disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-indigo-950/15 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                )}
                <span>{editingStatusId ? 'Atualizar Meu Status' : 'Salvar Meus Status'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Info & Self Summary Card Column */}
        <div className="space-y-5">
          {/* Member's Current Status Card (If already filled) */}
          {myExistingStatus ? (
            <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-3xl border border-indigo-100 p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#2a14b4] bg-[#eaedff] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Seu Registro Ativo
                </span>
                <span className="text-[11px] text-[#64748b] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(myExistingStatus.updatedAt)}
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-[#131b2e] font-display flex flex-wrap items-center gap-2">
                  <span>{myExistingStatus.memberName}</span>
                  {myExistingStatus.level && (
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                      Lv. {myExistingStatus.level}
                    </span>
                  )}
                  {myExistingStatus.classe && (
                    <span className="text-xs font-semibold text-[#475569] bg-white px-2 py-0.5 rounded-lg border border-[#e2e8f0]">
                      {myExistingStatus.classe}
                    </span>
                  )}
                </h3>
              </div>

              {/* Core stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                <div className="bg-white p-3 rounded-2xl border border-rose-100 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 mb-0.5">
                    <Swords className="w-3 h-3" />
                    <span>DANO</span>
                  </div>
                  <div className="text-base font-extrabold text-rose-950 tabular-nums">
                    {myExistingStatus.dano ? myExistingStatus.dano.toLocaleString('pt-BR') : '-'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-sky-600 mb-0.5">
                    <Shield className="w-3 h-3" />
                    <span>DEFESA</span>
                  </div>
                  <div className="text-base font-extrabold text-sky-950 tabular-nums">
                    {myExistingStatus.defesa ? myExistingStatus.defesa.toLocaleString('pt-BR') : '-'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mb-0.5">
                    <Crosshair className="w-3 h-3" />
                    <span>ACERTO</span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-950 tabular-nums">
                    {myExistingStatus.acerto ? myExistingStatus.acerto.toLocaleString('pt-BR') : '-'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-3 rounded-2xl border border-violet-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-violet-700 mb-0.5">
                    <Calculator className="w-3 h-3 text-violet-600" />
                    <span>MÉDIA</span>
                  </div>
                  <div className="text-base font-extrabold text-violet-950 tabular-nums">
                    {(myExistingStatus.acerto || myExistingStatus.defesa)
                      ? (((myExistingStatus.acerto || 0) + (myExistingStatus.defesa || 0)) / 2).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                      : '-'}
                  </div>
                  <div className="text-[10px] text-violet-600/80 font-medium">
                    (Acerto + Defesa) ÷ 2
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 shadow-2xs col-span-2 sm:col-span-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 mb-0.5">
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>POWER</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-950 tabular-nums">
                    {myExistingStatus.power ? myExistingStatus.power.toLocaleString('pt-BR') : '-'}
                  </div>
                </div>
              </div>

              {myExistingStatus.notes && (
                <div className="text-xs text-[#475569] bg-white/80 p-2.5 rounded-xl border border-indigo-100 mb-2.5 flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-[#2a14b4] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-[#1e293b]">Carteira: </span>
                    <span className="font-mono text-[11px] text-[#475569]">{myExistingStatus.notes}</span>
                  </div>
                </div>
              )}

              {myExistingStatus.imgurUrl && (
                <div className="text-xs text-emerald-950 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-emerald-950">Print Imgur: </span>
                      <span className="text-[11px] text-emerald-700 font-mono truncate">{myExistingStatus.imgurUrl}</span>
                    </div>
                  </div>
                  <a
                    href={myExistingStatus.imgurUrl.startsWith('http') ? myExistingStatus.imgurUrl : `https://${myExistingStatus.imgurUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 transition-colors flex items-center gap-1 shrink-0"
                    title="Visualizar print no Imgur"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleLoadExistingStatus(myExistingStatus)}
                className="w-full py-2 bg-white hover:bg-indigo-50 text-[#2a14b4] text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Atualizar Meus Valores</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-[#131b2e]">Ainda não preencheu?</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">
                Digite seu nome e preencha seus valores de Dano, Defesa, Acerto e Power ao lado para salvar seu status na guilda.
              </p>
            </div>
          )}

          {/* Confidentiality Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Privacidade & Regras de Acesso</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Todos os membros podem <strong>preencher</strong> e <strong>atualizar</strong> seus status quantas vezes quiserem.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Por decisão estratégica da guilda, <strong>somente os administradores</strong> têm permissão para visualizar o quadro geral e as informações de todos os membros.
            </p>
            {!isAdmin && (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="mt-1 w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Entrar como Administrador</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: ADMINISTRATOR DASHBOARD
          Visible ONLY to administrators as requested: "So os administradores vão poder ver as informações" */}
      {isAdmin ? (
        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 sm:p-8 shadow-xs space-y-6">
          {/* Top Admin Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#f1f5f9]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xl font-bold text-[#131b2e] font-display">
                  Quadro Geral de Status dos Membros
                </h2>
                <span className="text-xs font-extrabold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-md">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                Visão exclusiva de administrador. Dados atualizados em tempo real via nuvem.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`px-3.5 py-2 font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 border ${
                  allVisibleSelected
                    ? 'bg-[#2a14b4] text-white border-[#2a14b4]'
                    : 'bg-white hover:bg-[#eaedff] text-[#334155] hover:text-[#2a14b4] border-[#cbd5e1]'
                }`}
                title="Selecionar ou desmarcar todos os membros visíveis"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{allVisibleSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
              </button>

              {selectedStatusIds.size > 0 && (
                <button
                  type="button"
                  onClick={handlePromptBulkDelete}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 animate-in fade-in"
                  title="Remover membros selecionados da lista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Selecionados ({selectedStatusIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-white hover:bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] font-semibold text-xs rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                title="Exportar todos os status em formato CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingStatusId(null);
                  setFormMemberName('');
                  setFormLevel('');
                  setFormDano('');
                  setFormDefesa('');
                  setFormAcerto('');
                  setFormPower('');
                  setFormNotes('');
                  setFormImgurUrl('');
                  setShowAdminAddModal(true);
                }}
                className="px-3.5 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Registro</span>
              </button>
            </div>
          </div>

          {/* Bulk Action Bar when members are selected */}
          {selectedStatusIds.size > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs shadow-2xs">
                  {selectedStatusIds.size}
                </span>
                <div>
                  <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <span>
                      {selectedStatusIds.size === 1
                        ? '1 membro selecionado'
                        : `${selectedStatusIds.size} membros selecionados`}
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-medium">
                    Clique em "Remover Selecionados" para excluir todos os registros marcados de uma vez.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  Desmarcar todos
                </button>
                <button
                  type="button"
                  onClick={handlePromptBulkDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover ({selectedStatusIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-[#fafbfc] border border-[#e2e8f0] rounded-2xl p-4">
              <div className="text-xs font-bold text-[#64748b] mb-1">Membros com Status</div>
              <div className="text-2xl font-extrabold text-[#131b2e] tabular-nums">
                {totalMembers}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">Registrados</div>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Média de Power</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-950 tabular-nums">
                {avgPower.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-1">Força da Guilda</div>
            </div>

            <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1">
                <Swords className="w-3.5 h-3.5 text-rose-600" />
                <span>Top Dano</span>
              </div>
              <div className="text-2xl font-extrabold text-rose-950 tabular-nums">
                {maxDano.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-rose-700 font-medium mt-1">Maior Dano Atual</div>
            </div>

            <div className="bg-sky-50/50 border border-sky-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-sky-800 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-sky-600" />
                <span>Média de Defesa</span>
              </div>
              <div className="text-2xl font-extrabold text-sky-950 tabular-nums">
                {avgDefesa.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-sky-700 font-medium mt-1">Proteção média</div>
            </div>

            <div className="bg-violet-50/50 border border-violet-200/80 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <div className="text-xs font-bold text-violet-800 mb-1 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-violet-600" />
                <span>Média Geral</span>
              </div>
              <div className="text-2xl font-extrabold text-violet-950 tabular-nums">
                {avgMedia.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-violet-700 font-medium mt-1">(Acerto + Defesa) ÷ 2</div>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#f8fafc] p-3 rounded-2xl border border-[#e2e8f0]">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar membro por nome ou classe..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#94a3b8] hover:text-[#475569]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs text-[#64748b] font-medium">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Ordenar:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-white border border-[#cbd5e1] rounded-xl px-2.5 py-1.5 font-semibold text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2a14b4] cursor-pointer"
              >
                <option value="power">⚡ Maior Power</option>
                <option value="level">🎖️ Maior Level</option>
                <option value="dano">⚔️ Maior Dano</option>
                <option value="defesa">🛡️ Maior Defesa</option>
                <option value="acerto">🎯 Maior Acerto</option>
                <option value="media">⚖️ Maior Média (Acerto + Def)</option>
                <option value="nome">🔤 Nome (A-Z)</option>
                <option value="data">🕒 Mais Recentes</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          {filteredStatuses.length === 0 ? (
            <div className="p-8 text-center bg-[#fafbfc] rounded-2xl border border-dashed border-[#cbd5e1] text-[#64748b]">
              <AlertCircle className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1e293b]">Nenhum membro encontrado</p>
              <p className="text-xs text-[#64748b] mt-1">
                {searchQuery
                  ? 'Nenhum resultado corresponde à sua pesquisa.'
                  : 'Nenhum membro preencheu os status ainda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] text-[#64748b] font-bold border-b border-[#e2e8f0] uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVisibleSelected;
                        }}
                        onChange={handleToggleSelectAll}
                        title={allVisibleSelected ? 'Desmarcar todos' : 'Selecionar todos os membros visíveis'}
                        className="w-4 h-4 rounded border-[#cbd5e1] text-[#2a14b4] focus:ring-0 cursor-pointer accent-[#2a14b4]"
                      />
                    </th>
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-4">Membro & Classe</th>
                    <th className="py-3 px-3 text-center">Level</th>
                    <th className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <Swords className="w-3.5 h-3.5" />
                        Dano
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-sky-700">
                        <Shield className="w-3.5 h-3.5" />
                        Defesa
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Crosshair className="w-3.5 h-3.5" />
                        Acerto
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-violet-700" title="Média: (Acerto + Defesa) ÷ 2">
                        <Calculator className="w-3.5 h-3.5" />
                        Média
                      </span>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <Zap className="w-3.5 h-3.5" />
                        Power
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center">Print Imgur</th>
                    <th className="py-3 px-3 text-center">Atualizado</th>
                    <th className="py-3 px-3 text-center w-20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredStatuses.map((st, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <tr
                        key={st.id}
                        className={`transition-colors group ${
                          selectedStatusIds.has(st.id)
                            ? 'bg-indigo-50/80 border-l-4 border-l-[#2a14b4]'
                            : 'hover:bg-[#f8fafc]'
                        }`}
                      >
                        {/* Select Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedStatusIds.has(st.id)}
                            onChange={() => handleToggleSelectStatus(st.id)}
                            title={selectedStatusIds.has(st.id) ? 'Desmarcar membro' : 'Selecionar membro'}
                            className="w-4 h-4 rounded border-[#cbd5e1] text-[#2a14b4] focus:ring-0 cursor-pointer accent-[#2a14b4]"
                          />
                        </td>

                        {/* Rank Position */}
                        <td className="py-3 px-3 text-center font-bold">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-2xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-[#94a3b8] text-xs font-bold">{index + 1}</span>
                          )}
                        </td>

                        {/* Member Name and Class */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-[#131b2e] flex items-center gap-1.5">
                            <span>{st.memberName}</span>
                            {st.notes && (
                              <span
                                className="text-[10px] text-[#2a14b4] bg-indigo-50 px-1.5 py-0.5 rounded cursor-help font-mono border border-indigo-100 flex items-center gap-0.5"
                                title={`Carteira: ${st.notes}`}
                              >
                                <span>👛</span>
                                <span className="max-w-[70px] truncate">{st.notes}</span>
                              </span>
                            )}
                          </div>
                          {st.classe && (
                            <div className="text-[11px] text-[#64748b] font-medium">
                              {st.classe}
                            </div>
                          )}
                        </td>

                        {/* Level */}
                        <td className="py-3 px-3 text-center font-bold">
                          {st.level ? (
                            <span className="inline-block text-indigo-700 bg-indigo-50 font-extrabold px-2 py-0.5 rounded-lg border border-indigo-100 text-[11px] tabular-nums">
                              Lv. {st.level}
                            </span>
                          ) : (
                            <span className="text-[#94a3b8] text-[11px]">-</span>
                          )}
                        </td>

                        {/* Dano */}
                        <td className="py-3 px-3 text-right font-extrabold text-rose-950 tabular-nums">
                          {st.dano ? st.dano.toLocaleString('pt-BR') : '-'}
                        </td>

                        {/* Defesa */}
                        <td className="py-3 px-3 text-right font-extrabold text-sky-950 tabular-nums">
                          {st.defesa ? st.defesa.toLocaleString('pt-BR') : '-'}
                        </td>

                        {/* Acerto */}
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-950 tabular-nums">
                          {st.acerto ? st.acerto.toLocaleString('pt-BR') : '-'}
                        </td>

                        {/* Média (Acerto + Defesa ÷ 2) */}
                        <td className="py-3 px-3 text-right font-extrabold text-violet-950 tabular-nums">
                          {(st.acerto || st.defesa)
                            ? (((st.acerto || 0) + (st.defesa || 0)) / 2).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                            : '-'}
                        </td>

                        {/* Power */}
                        <td className="py-3 px-4 text-right">
                          <span className="inline-block bg-gradient-to-r from-amber-50 to-amber-100/90 text-amber-950 font-black px-2.5 py-1 rounded-xl border border-amber-300/80 text-xs sm:text-sm tabular-nums shadow-2xs">
                            ⚡ {st.power ? st.power.toLocaleString('pt-BR') : '-'}
                          </span>
                        </td>

                        {/* Imgur Print Link */}
                        <td className="py-3 px-3 text-center">
                          {st.imgurUrl ? (
                            <a
                              href={st.imgurUrl.startsWith('http') ? st.imgurUrl : `https://${st.imgurUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                              title={`Abrir print no Imgur: ${st.imgurUrl}`}
                            >
                              <ImageIcon className="w-3 h-3 text-emerald-600" />
                              <span>Imgur</span>
                              <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                            </a>
                          ) : (
                            <span className="text-[#cbd5e1] text-[11px]">-</span>
                          )}
                        </td>

                        {/* Last Update */}
                        <td className="py-3 px-3 text-center text-[11px] text-[#64748b] tabular-nums whitespace-nowrap">
                          {formatRelativeTime(st.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleLoadExistingStatus(st);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1.5 text-[#64748b] hover:text-[#2a14b4] hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar status deste membro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStatus(st.id, st.memberName)}
                              className="p-1.5 text-[#64748b] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir registro deste membro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Notice card when member is NOT admin */
        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-[#2a14b4] flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-7 h-7 text-[#2a14b4]" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-bold text-lg text-[#131b2e] font-display">
              Informações Globais Protegidas
            </h3>
            <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed">
              Você pode preencher e atualizar seus status a qualquer momento no formulário acima.
              A visualização e comparação dos dados de todos os outros membros é reservada aos
              <strong> Administradores</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-indigo-950/15 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Fazer Login como Administrador</span>
          </button>
        </div>
      )}

      {/* Admin Add/Edit Modal (For easy manual entry) */}
      {showAdminAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-[#e2e8f0]">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2a14b4] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#131b2e]">
                  Cadastrar Status de Membro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminAddModal(false)}
                className="p-1 rounded-lg text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStatus} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-[#1e293b] mb-1">
                    Nome do Membro
                  </label>
                  <input
                    type="text"
                    required
                    value={formMemberName}
                    onChange={(e) => setFormMemberName(e.target.value)}
                    placeholder="Nome do membro"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:ring-2 focus:ring-[#2a14b4] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-[#1e293b] mb-1 flex items-center justify-between">
                    <span>Level</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 rounded font-bold">Lv.</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    placeholder="Ex: 110"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:ring-2 focus:ring-[#2a14b4] focus:outline-none font-bold tabular-nums"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-[#1e293b] mb-1">
                    Classe
                  </label>
                  <select
                    value={formClasse}
                    onChange={(e) => setFormClasse(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:ring-2 focus:ring-[#2a14b4] focus:outline-none bg-white"
                  >
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">⚔️ Dano</label>
                  <input
                    type="number"
                    value={formDano}
                    onChange={(e) => setFormDano(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 bg-rose-50/40 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-sky-700 mb-1">🛡️ Defesa</label>
                  <input
                    type="number"
                    value={formDefesa}
                    onChange={(e) => setFormDefesa(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-sky-200 bg-sky-50/40 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">🎯 Acerto</label>
                  <input
                    type="number"
                    step="any"
                    value={formAcerto}
                    onChange={(e) => setFormAcerto(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-emerald-200 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">⚡ Power</label>
                  <input
                    type="number"
                    value={formPower}
                    onChange={(e) => setFormPower(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-amber-300 bg-amber-50/50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Média Preview no Modal */}
              {(Number(formAcerto) > 0 || Number(formDefesa) > 0) && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-900 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-violet-600" />
                    <span>Média (Acerto + Defesa ÷ 2):</span>
                  </span>
                  <span className="font-extrabold text-violet-950 tabular-nums text-sm">
                    {(((Number(formAcerto) || 0) + (Number(formDefesa) || 0)) / 2).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#2a14b4]" />
                  <span>Carteira</span>
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Endereço da carteira ou chave (Ex: 0x...)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:ring-2 focus:ring-[#2a14b4] focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#64748b] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Link do Imgur (https://imgur.com)</span>
                  </label>
                  <a
                    href="https://imgur.com/upload"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5"
                  >
                    <span>Subir no Imgur</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="url"
                  value={formImgurUrl}
                  onChange={(e) => setFormImgurUrl(e.target.value)}
                  placeholder="https://imgur.com/... ou https://i.imgur.com/..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#cbd5e1] focus:ring-2 focus:ring-[#2a14b4] focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdminAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                  <span>Salvar Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Status Confirmation Modal */}
      {statusToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#131b2e]">Excluir Registro de Status</h3>
              <p className="text-xs text-[#64748b] mt-1">
                Deseja realmente remover o status de combate do membro{' '}
                <strong className="text-[#131b2e]">"{statusToDelete.name}"</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStatus}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Status Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#131b2e]">Remover Membros Selecionados</h3>
              <p className="text-xs text-[#64748b] mt-1.5">
                Tem certeza que deseja remover os registros de status de{' '}
                <strong className="text-rose-700">{selectedStatusIds.size}</strong>{' '}
                {selectedStatusIds.size === 1 ? 'membro selecionado' : 'membros selecionados'}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <span>Sim, Remover ({selectedStatusIds.size})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

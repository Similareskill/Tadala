import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Copy,
  Download,
  RotateCcw,
  Check,
  Volume2,
  Share2,
  Smartphone,
  QrCode,
  Lock,
  Crown,
  KeyRound,
  ShieldCheck,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  History,
  Search,
  X,
  Package,
  Swords,
  UserCheck,
} from 'lucide-react';
import { AppSettings, ShoppingItem, AdminAccount, ActivityLogEntry, ActivityType } from '../types/shopping';
import { formatCurrency, playHapticSound, formatDate, formatRelativeTime } from '../utils/helpers';
import { adminAuthService } from '../services/adminAuth';
import { activityLogService } from '../services/activityLogService';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  settings: AppSettings;
  items: ShoppingItem[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetDemoData: () => void;
  onClearAllItems: () => void;
  onOpenShareModal?: () => void;
  isAdmin?: boolean;
  adminUser?: AdminAccount | null;
  onOpenAdminLogin?: () => void;
  onAdminLogout?: () => void;
  onRequireAdmin?: (reason: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  items,
  onUpdateSettings,
  onResetDemoData,
  onClearAllItems,
  onOpenShareModal,
  isAdmin = false,
  adminUser,
  onOpenAdminLogin,
  onAdminLogout,
  onRequireAdmin,
}) => {
  const [household, setHousehold] = useState(settings.householdName);
  const [listName, setListName] = useState(settings.listName);
  const [currency, setCurrency] = useState(settings.currencySymbol);
  const [sound, setSound] = useState(settings.soundFeedback);
  const [newCategory, setNewCategory] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const { isDark, setTheme } = useTheme();

  // Admin password change form
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [showPassText, setShowPassText] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // Activity Log state (Admin-only view)
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => activityLogService.getLogs());
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<'all' | 'item' | 'status' | 'boss' | 'admin' | 'settings'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Subscribe to real-time activity logs
  useEffect(() => {
    const unsub = activityLogService.subscribe((logs) => {
      setActivityLogs(logs);
    });
    return () => unsub();
  }, []);

  const handleClearActivityLogs = async () => {
    if (!isAdmin) return;
    setClearingLogs(true);
    try {
      await activityLogService.clearLogs();
      setShowClearConfirm(false);
      playHapticSound('delete');
    } catch (err) {
      console.warn('Error clearing activity logs:', err);
    } finally {
      setClearingLogs(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Category filter
      if (logCategoryFilter === 'item') {
        if (!log.type.startsWith('item_')) return false;
      } else if (logCategoryFilter === 'status') {
        if (log.type !== 'status_update') return false;
      } else if (logCategoryFilter === 'boss') {
        if (!log.type.startsWith('boss_')) return false;
      } else if (logCategoryFilter === 'admin') {
        if (!log.type.startsWith('admin_')) return false;
      } else if (logCategoryFilter === 'settings') {
        if (log.type !== 'settings_update' && log.type !== 'category_change') return false;
      }

      // Search query
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase().trim();
        const matchTitle = log.title.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchUser = (log.userName || '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchUser;
      }

      return true;
    });
  }, [activityLogs, logCategoryFilter, logSearchQuery]);

  const getActivityIconAndColor = (type: ActivityType) => {
    switch (type) {
      case 'item_add':
        return {
          icon: <Plus className="w-3.5 h-3.5 text-emerald-600" />,
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'Item Adicionado',
        };
      case 'item_update':
        return {
          icon: <Package className="w-3.5 h-3.5 text-blue-600" />,
          badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
          label: 'Item Atualizado',
        };
      case 'item_delete':
      case 'item_clear':
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
          label: type === 'item_clear' ? 'Lista Limpa' : 'Item Removido',
        };
      case 'item_status':
        return {
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'Status do Item',
        };
      case 'item_restore':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />,
          badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          label: 'Restauração',
        };
      case 'status_update':
        return {
          icon: <Swords className="w-3.5 h-3.5 text-violet-600" />,
          badgeBg: 'bg-violet-50 text-violet-800 border-violet-200',
          label: 'Status / Combate',
        };
      case 'boss_event':
      case 'boss_checkin':
        return {
          icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Chefe / Boss',
        };
      case 'admin_login':
      case 'admin_logout':
      case 'admin_pass_change':
        return {
          icon: <KeyRound className="w-3.5 h-3.5 text-sky-600" />,
          badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
          label: 'Segurança Admin',
        };
      case 'settings_update':
      case 'category_change':
      default:
        return {
          icon: <Settings className="w-3.5 h-3.5 text-purple-600" />,
          badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
          label: 'Configurações',
        };
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.('alterar preferências gerais da despensa');
      return;
    }
    onUpdateSettings({
      ...settings,
      householdName: household.trim() || 'Despensa Central',
      listName: listName.trim() || 'Minha Lista de Compras',
      currencySymbol: currency,
      soundFeedback: sound,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.('adicionar novas categorias');
      return;
    }
    const cat = newCategory.trim();
    if (!cat || settings.categories.includes(cat)) return;
    onUpdateSettings({
      ...settings,
      categories: [...settings.categories, cat],
    });
    activityLogService.log({
      type: 'category_change',
      title: 'Nova Categoria Criada',
      description: `Categoria "${cat}" adicionada pelo Administrador.`,
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });
    setNewCategory('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (!isAdmin) {
      onRequireAdmin?.('remover categorias');
      return;
    }
    onUpdateSettings({
      ...settings,
      categories: settings.categories.filter((c) => c !== catToRemove),
    });
    activityLogService.log({
      type: 'category_change',
      title: 'Categoria Removida',
      description: `Categoria "${catToRemove}" foi excluída pelo Administrador.`,
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassFeedback(null);

    if (!currentPass || !newPass) {
      setPassFeedback({ type: 'error', msg: 'Preencha a senha atual e a nova senha.' });
      return;
    }
    if (newPass.length < 4) {
      setPassFeedback({ type: 'error', msg: 'A nova senha deve ter no mínimo 4 caracteres.' });
      return;
    }
    if (newPass !== confirmNewPass) {
      setPassFeedback({ type: 'error', msg: 'A confirmação de senha não coincide.' });
      return;
    }

    setPassLoading(true);
    try {
      const res = await adminAuthService.changePassword(currentPass, newPass, adminUser?.email);
      if (res.success) {
        playHapticSound('toggle');
        activityLogService.log({
          type: 'admin_pass_change',
          title: 'Senha de Admin Atualizada',
          description: 'A senha de acesso do Administrador foi redefinida com sucesso.',
          userName: adminUser?.email || 'Admin',
          userRole: 'admin',
        });
        setPassFeedback({ type: 'success', msg: 'Senha de Administrador alterada com sucesso!' });
        setCurrentPass('');
        setNewPass('');
        setConfirmNewPass('');
        setTimeout(() => setShowChangePass(false), 2200);
      } else {
        setPassFeedback({ type: 'error', msg: res.error || 'Erro ao alterar a senha.' });
      }
    } catch {
      setPassFeedback({ type: 'error', msg: 'Falha na comunicação ao atualizar senha.' });
    } finally {
      setPassLoading(false);
    }
  };

  const handleCopyForWhatsApp = () => {
    const pending = items.filter((i) => i.status === 'pendente');
    const inCart = items.filter((i) => i.status === 'no_carrinho');

    let text = `🛒 *${settings.listName}* (${settings.householdName})\n\n`;

    if (pending.length > 0) {
      text += `*A Comprar (${pending.length}):*\n`;
      pending.forEach((i) => {
        text += `• [ ] ${i.name} - ${i.quantity} ${i.unit} ${
          i.brandOrPreference ? `(${i.brandOrPreference})` : ''
        }\n`;
      });
      text += `\n`;
    }

    if (inCart.length > 0) {
      text += `*No Carrinho (${inCart.length}):*\n`;
      inCart.forEach((i) => {
        text += `• [✓] ~${i.name}~ - ${i.quantity} ${i.unit}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lista_compras_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-1">
          <span>{settings.householdName}</span>
          <span>&gt;</span>
          <span className="text-[#131b2e]">Configurações</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#131b2e] font-display">
              Configurações da Despensa
            </h2>
            <p className="text-xs text-[#64748b] mt-1">
              Personalize títulos, moeda, categorias e gerencie acessos de Administrador.
            </p>
          </div>
          {isAdmin ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold self-start sm:self-auto">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Acesso Administrador Ativo</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2a14b4] hover:bg-[#200e94] text-white rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Fazer Login de Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-admin read-only banner */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block">Configurações Bloqueadas para Edição</span>
              <span className="text-amber-800 text-xs">
                Apenas quem possui o login de Administrador pode alterar títulos, categorias ou limpar dados.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="self-stretch sm:self-auto px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Entrar como Admin</span>
          </button>
        </div>
      )}

      {/* Admin Security Card (Available when logged in as admin) */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-amber-50/60 to-indigo-50/40 rounded-2xl border border-amber-300 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]">
                  Conta de Administrador Autenticada
                </h3>
                <p className="text-xs text-[#64748b]">
                  Conectado como: <strong className="text-[#131b2e]">{adminUser?.email || 'admin@gestaodecompras.com'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangePass(!showChangePass);
                  setPassFeedback(null);
                }}
                className="px-3 py-1.5 bg-white hover:bg-[#f8fafc] border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>{showChangePass ? 'Cancelar' : 'Alterar Senha do Admin'}</span>
              </button>

              {onAdminLogout && (
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair do Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Change Password Dropdown Form */}
          {showChangePass && (
            <form onSubmit={handleChangePasswordSubmit} className="bg-white rounded-xl p-4 border border-amber-200 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-[#131b2e]">
                Redefinir Senha do Administrador
              </div>

              {passFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passFeedback.msg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Senha Atual
                  </label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Senha atual"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs focus:outline-none focus:border-[#2a14b4]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Nova Senha
                  </label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs focus:outline-none focus:border-[#2a14b4]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    required
                    value={confirmNewPass}
                    onChange={(e) => setConfirmNewPass(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs focus:outline-none focus:border-[#2a14b4]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassText(!showPassText)}
                  className="text-xs text-[#64748b] hover:text-[#131b2e] flex items-center gap-1 cursor-pointer"
                >
                  {showPassText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassText ? 'Ocultar caracteres' : 'Mostrar caracteres'}</span>
                </button>

                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {passLoading ? 'Salvando...' : 'Atualizar Senha de Admin'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* General Settings Card */}
      <form
        onSubmit={handleSaveGeneral}
        className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-xs space-y-4"
      >
        <h3 className="text-sm font-bold text-[#131b2e] border-b border-[#f1f5f9] pb-3 flex items-center justify-between">
          <span>Geral & Identificação</span>
          {!isAdmin && <span className="text-xs text-[#94a3b8] font-normal">Somente Leitura</span>}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Nome da Despensa / Residência
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={household}
              onChange={(e) => setHousehold(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none disabled:bg-[#f1f5f9] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Nome da Lista Atual
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none disabled:bg-[#f1f5f9] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Símbolo de Moeda
            </label>
            <select
              disabled={!isAdmin}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none cursor-pointer disabled:bg-[#f1f5f9] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
            >
              <option value="R$">R$ (Real Brasileiro)</option>
              <option value="€">€ (Euro)</option>
              <option value="$">$ (Dólar)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="sound-check"
              disabled={!isAdmin}
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-4 h-4 rounded border-[#cbd5e1] text-[#2a14b4] focus:ring-0 cursor-pointer accent-[#2a14b4] disabled:cursor-not-allowed"
            />
            <label htmlFor="sound-check" className="text-xs font-semibold text-[#334155] cursor-pointer">
              Ativar feedback sonoro tátil nas ações
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedFeedback && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Configurações salvas com sucesso!
            </span>
          )}
          {isAdmin ? (
            <button
              type="submit"
              className="ml-auto px-5 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Salvar Preferências
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="ml-auto px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Entrar como Admin para Editar</span>
            </button>
          )}
        </div>
      </form>

      {/* Theme & Appearance Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2a14b4] flex items-center justify-center">
              {isDark ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-[#2a14b4]" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#131b2e]">Aparência & Cor</h3>
              <p className="text-xs text-[#64748b]">Alterne entre o tema claro e o tema escuro</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {isDark ? '🌙 Modo Escuro Ativo' : '☀️ Modo Claro Ativo'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Light Theme Button */}
          <button
            type="button"
            onClick={() => {
              playHapticSound('toggle');
              setTheme('light');
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-start gap-3.5 ${
              !isDark
                ? 'border-[#2a14b4] bg-[#f2f3ff]/60 shadow-xs'
                : 'border-[#e2e8f0] hover:border-[#cbd5e1] bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#131b2e]">Tema Claro</span>
                {!isDark && <Check className="w-4 h-4 text-[#2a14b4]" />}
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                Visual nítido e iluminado com fundo limpo.
              </p>
            </div>
          </button>

          {/* Dark Theme Button */}
          <button
            type="button"
            onClick={() => {
              playHapticSound('toggle');
              setTheme('dark');
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-start gap-3.5 ${
              isDark
                ? 'border-amber-400 bg-[#1e2638] shadow-xs'
                : 'border-[#e2e8f0] hover:border-[#cbd5e1] bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-950 text-amber-300 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#131b2e]">Tema Escuro</span>
                {isDark && <Check className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                Visual escuro com alto contraste, ideal para ambientes com pouca luz.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Categories Management Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#131b2e] border-b border-[#f1f5f9] pb-3 flex items-center justify-between">
          <span>Categorias de Produtos</span>
          {!isAdmin && <span className="text-xs text-[#94a3b8] font-normal">Requer Admin</span>}
        </h3>

        {isAdmin ? (
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nova categoria (ex: Orgânicos, Bebê, Churrasco...)"
              className="flex-1 px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-xs text-[#131b2e] transition-all focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newCategory.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </form>
        ) : (
          <p className="text-xs text-[#64748b]">
            Apenas o Administrador pode adicionar ou excluir categorias.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {settings.categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#faf8ff] text-[#2a14b4] border border-[#eaedff]"
            >
              {cat}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-[#94a3b8] hover:text-[#ef4444] ml-1 transition-colors cursor-pointer"
                  title={`Remover categoria ${cat}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* HISTÓRICO DE REGISTRO DE ATIVIDADES - SÓ ADMINISTRADOR PODE VER */}
      {!isAdmin ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-2xs">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]">
                  Histórico de Registro de Atividades
                </h3>
                <p className="text-xs text-[#64748b]">
                  Auditoria de ações, itens, alterações de status e acessos
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Somente Administrador</span>
            </span>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Acesso Restrito: Somente Administrador</span>
                <span className="text-amber-800 text-xs">
                  O histórico completo de registro de atividades contém auditoria confidencial de modificações e só o administrador tem permissão para visualizar.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="self-stretch sm:self-auto px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Entrar como Admin</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#2a14b4] flex items-center justify-center shadow-xs">
                <History className="w-5 h-5 text-[#2a14b4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#131b2e]">
                    Histórico de Registro de Atividades
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                    <Crown className="w-3 h-3 text-amber-700" />
                    <span>Visível Apenas para Admin</span>
                  </span>
                </div>
                <p className="text-xs text-[#64748b]">
                  Auditoria cronológica em tempo real de todas as ações e eventos ({activityLogs.length} registros)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activityLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  title="Limpar todos os registros de atividade"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Registros</span>
                </button>
              )}
            </div>
          </div>

          {/* Clear Confirmation Prompt */}
          {showClearConfirm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Confirmar exclusão de todo o histórico de atividades?</span>
              </div>
              <p className="text-rose-800 text-[11px]">
                Esta ação apagará permanentemente todos os registros de auditoria do sistema salvos.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={clearingLogs}
                  onClick={handleClearActivityLogs}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {clearingLogs ? 'Limpando...' : 'Sim, Limpar Histórico'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Search & Category Filter Pills */}
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Pesquisar por ação, item, membro ou detalhe..."
                className="w-full pl-9 pr-8 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-xs font-medium text-[#131b2e] transition-all focus:outline-none"
              />
              {logSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLogSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Todos (${activityLogs.length})` },
                { id: 'item', label: '📦 Itens' },
                { id: 'status', label: '⚔️ Combate/Média' },
                { id: 'boss', label: '🐉 Chefes' },
                { id: 'admin', label: '🔐 Segurança' },
                { id: 'settings', label: '⚙️ Ajustes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLogCategoryFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    logCategoryFilter === tab.id
                      ? 'bg-[#2a14b4] text-white shadow-2xs'
                      : 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Timeline List */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-2xl">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Nenhum registro encontrado</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {logSearchQuery ? 'Tente buscar por outro termo.' : 'Novas atividades aparecerão aqui automaticamente.'}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const { icon, badgeBg, label } = getActivityIconAndColor(log.type);
                return (
                  <div
                    key={log.id}
                    className="p-3 sm:p-3.5 bg-[#fbfcfe] hover:bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl flex items-start gap-3 transition-colors shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#131b2e]">
                            {log.title}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeBg}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#64748b] shrink-0">
                          <span title={formatDate(log.timestamp)} className="font-semibold text-slate-700">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#334155] leading-relaxed break-words">
                        {log.description}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#64748b]">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {log.userRole === 'admin' ? (
                            <>
                              <Crown className="w-3 h-3 text-amber-600" />
                              <span>Admin ({log.userName || 'Principal'})</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 text-indigo-600" />
                              <span>{log.userName || 'Membro'}</span>
                            </>
                          )}
                        </span>
                        <span className="text-slate-400">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Export & Sharing Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#131b2e] border-b border-[#f1f5f9] pb-3">
          Exportar & Compartilhar Lista
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="sm:col-span-2 flex items-center justify-center gap-2 p-3.5 bg-[#eaedff] hover:bg-[#dbe1ff] border border-[#c7d2fe] rounded-xl text-xs font-bold text-[#2a14b4] transition-all cursor-pointer shadow-2xs"
            >
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
              <span>Abrir no Celular ou Tablet (QR Code & Link Sem Senha)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyForWhatsApp}
            className="flex items-center justify-center gap-2 p-3 bg-[#f8fafc] hover:bg-[#faf8ff] border border-[#e2e8f0] hover:border-[#4338ca] rounded-xl text-xs font-bold text-[#131b2e] transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">Copiado para WhatsApp!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#2a14b4]" />
                <span>Copiar texto formatado (WhatsApp)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="flex items-center justify-center gap-2 p-3 bg-[#f8fafc] hover:bg-[#faf8ff] border border-[#e2e8f0] hover:border-[#4338ca] rounded-xl text-xs font-bold text-[#131b2e] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#2a14b4]" />
            <span>Baixar Arquivo JSON (Backup)</span>
          </button>
        </div>
      </div>

      {/* Danger & Reset Zone */}
      <div className="bg-white rounded-2xl border border-[#fee2e2] p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#991b1b] border-b border-rose-100 pb-3">
          Restauração & Dados
        </h3>
        <p className="text-xs text-[#64748b]">
          Restaure os 6 itens da demonstração do ecrã inicial com fotos originais de alta definição, ou limpe todos os itens.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isAdmin) {
                onRequireAdmin?.('restaurar dados de demonstração');
                return;
              }
              onResetDemoData();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#f8fafc] hover:bg-[#faf8ff] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#131b2e] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#2a14b4]" />
            Restaurar Itens da Imagem de Exemplo
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isAdmin) {
                onRequireAdmin?.('limpar todos os itens da lista');
                return;
              }
              onClearAllItems();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-[#b91c1c] transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Todos os Itens
          </button>
        </div>
      </div>
    </div>
  );
};

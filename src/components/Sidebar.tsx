import React from 'react';
import {
  CheckSquare,
  ListOrdered,
  History,
  Settings,
  Wifi,
  LogOut,
  Sparkles,
  Crown,
  KeyRound,
  ShieldCheck,
  Lock,
  Swords,
  Trophy,
  Flame,
  Zap,
  Radio,
} from 'lucide-react';
import { AdminAccount } from '../types/shopping';

export type TabType = 'lista' | 'historico' | 'checkin' | 'rank' | 'status' | 'voicechat' | 'configuracoes';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingCount?: number;
  openBossesCount?: number;
  cartCount?: number;
  totalUnits?: number;
  user?: { email?: string | null; displayName?: string | null; isAnonymous?: boolean } | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenShareModal?: () => void;
  isAdmin?: boolean;
  adminUser?: AdminAccount | null;
  onOpenAdminLogin?: () => void;
  onAdminLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingCount = 0,
  openBossesCount = 0,
  user,
  onOpenAuth,
  onSignOut,
  onOpenShareModal,
  isAdmin = false,
  adminUser,
  onOpenAdminLogin,
  onAdminLogout,
}) => {
  const userInitials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'DS';

  const userLabel =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Dispositivo Sincronizado');

  return (
    <aside className="w-64 bg-white dark:bg-[#131826] border-r border-[#e2e8f0] dark:border-[#222b3e] flex flex-col shrink-0 min-h-screen transition-colors duration-200">
      {/* Brand & App Title */}
      <div className="p-5 border-b border-[#f1f5f9] dark:border-[#222b3e] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2a14b4] text-white flex items-center justify-center shadow-md shadow-indigo-900/10 shrink-0">
          <CheckSquare className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="leading-tight">
          <h1 className="font-bold text-[#131b2e] dark:text-[#f1f5f9] text-lg tracking-tight font-display">
            Lista
          </h1>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-medium">Gestão de Craft</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1.5 flex-1">
        <button
          onClick={() => onSelectTab('lista')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'lista'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <ListOrdered className="w-4 h-4" />
            <span>Lista</span>
          </div>
          {pendingCount > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${
                currentTab === 'lista'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#e0e7ff] text-[#3730a3]'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('historico')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'historico'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <History className="w-4 h-4" />
            <span>Histórico</span>
          </div>
          {!isAdmin && (
            <span className="text-[10px] text-[#94a3b8] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10" title="Somente Leitura">
              Leitura
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('checkin')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'checkin'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Swords className="w-4 h-4" />
            <span>Check-in</span>
          </div>
          {openBossesCount > 0 ? (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5 animate-pulse ${
                currentTab === 'checkin'
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <Flame className="w-3 h-3" />
              {openBossesCount}
            </span>
          ) : (
            <span className="text-[10px] text-[#94a3b8] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
              Boss
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('rank')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'rank'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-4 h-4" />
            <span>Rank de Pontos</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              currentTab === 'rank'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            🏆
          </span>
        </button>

        <button
          onClick={() => onSelectTab('status')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'status'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4" />
            <span>Status</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              currentTab === 'status'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
            }`}
          >
            ⚔️ Stats
          </span>
        </button>

        <button
          onClick={() => onSelectTab('voicechat')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'voicechat'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>VoiceChat</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5 ${
              currentTab === 'voicechat'
                ? 'bg-emerald-400 text-emerald-950'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40'
            }`}
          >
            🎙️ Voz & Chat
          </span>
        </button>

        <button
          onClick={() => onSelectTab('configuracoes')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'configuracoes'
              ? 'bg-[#3b2fc4] text-white shadow-sm shadow-indigo-950/20'
              : 'text-[#475569] dark:text-[#94a3b8] hover:bg-[#f2f3ff] dark:hover:bg-[#1a2233] hover:text-[#2a14b4] dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </div>
          {!isAdmin && (
            <span title="Requer Administrador para editar">
              <Lock className="w-3.5 h-3.5 text-[#94a3b8]" />
            </span>
          )}
        </button>
      </nav>

      {/* Admin Access Panel Card */}
      <div className="p-3 border-t border-[#f1f5f9] dark:border-[#222b3e] bg-[#fafbfc] dark:bg-[#0f1422] space-y-2">
        {isAdmin ? (
          <div className="p-3 bg-gradient-to-br from-amber-50 to-indigo-50/50 dark:from-amber-950/30 dark:to-indigo-950/30 rounded-2xl border border-amber-300 dark:border-amber-600/50 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-xs">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#131b2e] dark:text-amber-100 flex items-center gap-1">
                    <span>Administrador</span>
                    <span className="text-[9px] bg-amber-400 text-amber-950 px-1 rounded font-extrabold">
                      ATIVO
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748b] dark:text-amber-200/70 truncate max-w-[130px]">
                    {adminUser?.email || 'admin'}
                  </div>
                </div>
              </div>
              {onAdminLogout && (
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="p-1.5 text-[#64748b] dark:text-amber-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                  title="Sair do modo Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-amber-900 dark:text-amber-200/90 font-medium">
              Permissão total para modificar lista, histórico e configurações.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-white dark:bg-[#161c2a] rounded-2xl border border-[#e2e8f0] dark:border-[#222b3e] shadow-2xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#f1f5f9] dark:bg-[#1f283b] text-[#64748b] dark:text-[#94a3b8] flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-[#1e293b] dark:text-[#f1f5f9]">Modo Visualizador</p>
                <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">Somente leitura</p>
              </div>
            </div>
            <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1 mb-2 leading-relaxed">
              Apenas quem tem login de Admin pode mexer e editar.
            </p>
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="w-full py-2 px-3 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Login de Admin</span>
            </button>
          </div>
        )}

        {/* Device Sync Info */}
        <div className="px-1 flex items-center justify-center text-[11px] text-[#64748b] dark:text-[#94a3b8]">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
            <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Nuvem Sincronizada
          </span>
        </div>
      </div>
    </aside>
  );
};

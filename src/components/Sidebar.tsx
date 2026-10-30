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
} from 'lucide-react';
import { AdminAccount } from '../types/shopping';
import nightCrowsEmblem from '../assets/images/night_crows_emblem_1792563012471.jpg';

export type TabType = 'lista' | 'historico' | 'checkin' | 'rank' | 'status' | 'configuracoes';

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
    <aside className="w-64 bg-[#0c0f17] border-r border-[#1f273a] flex flex-col shrink-0 min-h-screen transition-colors duration-200">
      {/* Brand & App Title - Night Crows */}
      <div className="p-4 border-b border-[#1f273a] flex items-center gap-3 bg-gradient-to-r from-[#080a0f] to-[#121624]">
        <div className="w-11 h-11 rounded-xl bg-black border border-[#c5a059]/40 overflow-hidden shadow-lg shadow-black/60 shrink-0 p-0.5">
          <img
            src={nightCrowsEmblem}
            alt="Emblema Night Crows"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <div className="leading-tight min-w-0">
          <h1 className="font-bold text-[#f3e8c7] text-sm tracking-wider font-cinzel truncate flex items-center gap-1.5">
            <span>TADALA FILA</span>
          </h1>
          <p className="text-[10px] text-[#c5a059] font-medium tracking-wide">NIGHT CROWS • CRAFT & FILA</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1.5 flex-1">
        <button
          onClick={() => onSelectTab('lista')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'lista'
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] font-bold shadow-md shadow-black/40 border border-[#f5eccb]/40'
              : 'text-[#8e9cb3] hover:bg-[#141a29] hover:text-[#f3e8c7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <ListOrdered className="w-4 h-4" />
            <span className="font-cinzel text-xs tracking-wider">Lista de Craft</span>
          </div>
          {pendingCount > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${
                currentTab === 'lista'
                  ? 'bg-[#080a0f]/30 text-[#080a0f]'
                  : 'bg-[#1e2538] text-[#c5a059] border border-[#c5a059]/30'
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
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] font-bold shadow-md shadow-black/40 border border-[#f5eccb]/40'
              : 'text-[#8e9cb3] hover:bg-[#141a29] hover:text-[#f3e8c7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <History className="w-4 h-4" />
            <span className="font-cinzel text-xs tracking-wider">Histórico</span>
          </div>
          {!isAdmin && (
            <span className="text-[10px] text-[#64748b] px-1.5 py-0.5 rounded bg-black/40 border border-[#1f273a]" title="Somente Leitura">
              Leitura
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('checkin')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'checkin'
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] font-bold shadow-md shadow-black/40 border border-[#f5eccb]/40'
              : 'text-[#8e9cb3] hover:bg-[#141a29] hover:text-[#f3e8c7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Swords className="w-4 h-4" />
            <span className="font-cinzel text-xs tracking-wider">Boss Check-in</span>
          </div>
          {openBossesCount > 0 ? (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5 animate-pulse ${
                currentTab === 'checkin'
                  ? 'bg-rose-950 text-rose-200 border border-rose-600'
                  : 'bg-rose-900/40 text-rose-300 border border-rose-700/60'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              {openBossesCount}
            </span>
          ) : (
            <span className="text-[10px] text-[#64748b] px-1.5 py-0.5 rounded bg-black/40 border border-[#1f273a]">
              Boss
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('rank')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'rank'
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] font-bold shadow-md shadow-black/40 border border-[#f5eccb]/40'
              : 'text-[#8e9cb3] hover:bg-[#141a29] hover:text-[#f3e8c7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-4 h-4" />
            <span className="font-cinzel text-xs tracking-wider">Rank Guilda</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              currentTab === 'rank'
                ? 'bg-amber-950 text-amber-200 border border-amber-600'
                : 'bg-amber-950/40 text-amber-300 border border-amber-700/40'
            }`}
          >
            🏆
          </span>
        </button>

        <button
          onClick={() => onSelectTab('status')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'status'
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] font-bold shadow-md shadow-black/40 border border-[#f5eccb]/40'
              : 'text-[#8e9cb3] hover:bg-[#141a29] hover:text-[#f3e8c7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4" />
            <span className="font-cinzel text-xs tracking-wider">Status Combate</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              currentTab === 'status'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-600'
                : 'bg-cyan-950/40 text-cyan-300 border border-cyan-700/40'
            }`}
          >
            ⚔️ Stats
          </span>
        </button>

        <button
          onClick={() => onSelectTab('configuracoes')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
            currentTab === 'configuracoes'
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] font-bold shadow-md shadow-black/40 border border-[#f5eccb]/40'
              : 'text-[#8e9cb3] hover:bg-[#141a29] hover:text-[#f3e8c7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            <span className="font-cinzel text-xs tracking-wider">Configurações</span>
          </div>
          {!isAdmin && (
            <span title="Requer Administrador para editar">
              <Lock className="w-3.5 h-3.5 text-[#64748b]" />
            </span>
          )}
        </button>
      </nav>

      {/* Admin Access Panel Card */}
      <div className="p-3 border-t border-[#1f273a] bg-[#090b12] space-y-2">
        {isAdmin ? (
          <div className="p-3 bg-gradient-to-br from-[#1b1710] to-[#121624] rounded-2xl border border-[#c5a059]/50 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c5a059] to-[#8c6f2e] text-[#080a0f] flex items-center justify-center font-bold shadow-sm">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#f3e8c7] font-cinzel flex items-center gap-1">
                    <span>Comandante</span>
                    <span className="text-[9px] bg-[#c5a059] text-[#080a0f] px-1 rounded font-extrabold">
                      ADMIN
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8e9cb3] truncate max-w-[130px]">
                    {adminUser?.email || 'admin'}
                  </div>
                </div>
              </div>
              {onAdminLogout && (
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="p-1.5 text-[#8e9cb3] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Sair do modo Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-[#c5a059]/90 font-medium">
              Controle de lista, histórico e parâmetros de combate.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-[#0f131d] rounded-2xl border border-[#1f273a] shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#181f2f] text-[#8e9cb3] flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-[#f1f5f9] font-cinzel">Membro Observador</p>
                <p className="text-[10px] text-[#64748b]">Somente leitura</p>
              </div>
            </div>
            <p className="text-[11px] text-[#8e9cb3] mt-1 mb-2 leading-relaxed">
              Login de Administrador para editar dados da guilda.
            </p>
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="w-full py-2 px-3 bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] text-xs font-bold font-cinzel rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-black/40"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Login de Admin</span>
            </button>
          </div>
        )}

        {/* Device Sync Info */}
        <div className="px-1 flex items-center justify-center text-[11px] text-[#8e9cb3]">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Nuvem Sincronizada
          </span>
        </div>
      </div>
    </aside>
  );
};

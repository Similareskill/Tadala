import React from 'react';
import {
  Search,
  Plus,
  Menu,
  QrCode,
  LogOut,
  Wifi,
  User,
  ShieldCheck,
  Crown,
  Lock,
} from 'lucide-react';
import { AdminAccount } from '../types/shopping';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggleButton } from './ThemeToggleButton';
import nightCrowsEmblem from '../assets/images/night_crows_emblem_1792563012471.jpg';

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewItem: () => void;
  onOpenProfile?: () => void;
  onToggleMobileMenu?: () => void;
  user: { email?: string | null; displayName?: string | null; isAnonymous?: boolean } | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenShareModal: () => void;
  isSyncing?: boolean;
  isAdmin?: boolean;
  adminUser?: AdminAccount | null;
  onOpenAdminLogin?: () => void;
  onAdminLogout?: () => void;
  connectedDevices?: number;
  syncStatus?: 'connected' | 'connecting' | 'syncing' | 'offline';
  latencyMs?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewItem,
  onToggleMobileMenu,
  user,
  onOpenAuth,
  onSignOut,
  onOpenShareModal,
  isSyncing = false,
  isAdmin = false,
  adminUser,
  onOpenAdminLogin,
  onAdminLogout,
  connectedDevices = 1,
  syncStatus = 'connected',
  latencyMs = 2,
}) => {
  const { currentButtonColor, getButtonGradient, getButtonTextColor } = useTheme();

  const userInitials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'NC';

  const userLabel =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guerreiro da Guilda');

  return (
    <header className="h-16 bg-[#0a0d15]/90 backdrop-blur-md border-b border-[#1f273a] px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 transition-colors duration-200">
      {/* Mobile Menu trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-[#8e9cb3] hover:bg-[#141a29] rounded-lg cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-[#c5a059]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black border border-[#c5a059]/40 overflow-hidden shrink-0 p-0.5 shadow-sm">
            <img
              src={nightCrowsEmblem}
              alt="Emblema Night Crows"
              className="w-full h-full object-cover rounded-md"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-bold text-[#f3e8c7] font-cinzel text-xs tracking-wider">TADALA FILA</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748b]">
          <Search className="w-4 h-4 text-[#c5a059]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar itens de craft, boss ou status..."
          className="w-full pl-10 pr-4 py-2 bg-[#0d1019] border border-[#222a3d] focus:border-[#c5a059] focus:bg-[#111624] rounded-xl text-sm text-[#f1f5f9] placeholder-[#64748b] transition-colors focus:outline-none shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#64748b] hover:text-[#f3e8c7] cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Actions: Admin Status, + Novo Item, Celular */}
      <div className="flex items-center gap-2">
        {/* Admin Status Pill when logged in */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#1c160c] to-[#141926] border border-[#c5a059]/50 text-[#f3e8c7] px-2.5 py-1.5 rounded-xl shadow-md shadow-black/40">
            <Crown className="w-4 h-4 text-[#c5a059] shrink-0" />
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[11px] font-bold text-[#f3e8c7] font-cinzel flex items-center gap-1">
                <span>Comandante</span>
                <span className="text-[9px] bg-[#c5a059] text-[#080a0f] px-1 py-0.2 rounded font-extrabold">
                  TOTAL
                </span>
              </div>
              <div className="text-[10px] text-[#8e9cb3] truncate max-w-[120px]">
                {adminUser?.email || 'admin'}
              </div>
            </div>
            {onAdminLogout && (
              <button
                type="button"
                onClick={onAdminLogout}
                className="ml-1 p-1 text-[#8e9cb3] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Sair do modo Administrador"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Novo Item Button */}
        <button
          onClick={onOpenNewItem}
          style={currentButtonColor ? { background: getButtonGradient(currentButtonColor), color: getButtonTextColor(currentButtonColor), borderColor: `${currentButtonColor}aa` } : undefined}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 shadow-md cursor-pointer whitespace-nowrap ${
            isAdmin
              ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] font-cinzel font-bold shadow-black/50'
              : 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] font-cinzel font-bold shadow-black/50'
          }`}
          title={isAdmin ? 'Adicionar novo item de craft' : 'Apenas o Administrador pode adicionar itens. Clique para fazer login.'}
        >
          {isAdmin ? (
            <Plus className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" style={currentButtonColor ? { color: getButtonTextColor(currentButtonColor) } : undefined} />
          )}
          <span className="hidden sm:inline font-cinzel text-xs tracking-wider">Novo Item</span>
        </button>



        {/* Dark / Light Theme Toggle Button */}
        <ThemeToggleButton size="md" />

        {/* Live Multi-Device Sync Indicator */}
        <button
          type="button"
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f1422] hover:bg-[#151c2e] border border-[#242e44] text-xs font-bold transition-all cursor-pointer shadow-xs select-none"
          title={`Sincronização Global Ativa: ${connectedDevices} ${connectedDevices === 1 ? 'aparelho conectado' : 'aparelhos conectados'}. Latência: ${latencyMs}ms. Clique para ver status, QR Code e conectar celular.`}
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${syncStatus === 'syncing' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <Wifi className="w-3.5 h-3.5 text-[#c5a059]" />
          <span className="hidden md:inline text-[11px] font-bold text-[#f3e8c7] font-cinzel">
            {connectedDevices} {connectedDevices === 1 ? 'Aparelho' : 'Aparelhos'}
          </span>
          <span className="hidden xl:inline text-[9px] font-mono bg-[#1a2336] text-[#c5a059] px-1.5 py-0.2 rounded border border-[#2d3a54]">
            {latencyMs}ms
          </span>
        </button>

        {/* Device Profile / User Badge */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-[#e2e8f0] dark:border-[#222b3e]">
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#faf8ff] dark:bg-[#161c2a] hover:bg-[#f2f3ff] dark:hover:bg-[#1e2638] border border-[#eaedff] dark:border-[#263147] transition-colors cursor-pointer"
            title={`Aparelho identificado como: ${userLabel}.`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#2a14b4] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <span className="block text-xs font-bold text-[#131b2e] dark:text-[#f1f5f9] truncate max-w-[110px]">
                {userLabel}
              </span>
              <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-medium flex items-center gap-1">
                {isAdmin ? '👑 Admin' : '👀 Visualizador'}
              </span>
            </div>
          </button>

          {user && !user.isAnonymous && (
            <button
              onClick={onSignOut}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-100 dark:hover:border-rose-900 transition-colors cursor-pointer"
              title="Sair da conta Google/E-mail"
              aria-label="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

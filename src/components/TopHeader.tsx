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
import { ThemeToggleButton } from './ThemeToggleButton';

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
}) => {
  const userInitials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'DS';

  const userLabel =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Dispositivo Sincronizado');

  return (
    <header className="h-16 bg-white dark:bg-[#131826] border-b border-[#e2e8f0] dark:border-[#222b3e] px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 transition-colors duration-200">
      {/* Mobile Menu trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-[#475569] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1c2438] rounded-lg cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black border border-cyan-500/30 overflow-hidden shrink-0 p-0.5">
            <img
              src="/src/assets/images/tadala_gaming_logo_1791192069968.jpg"
              alt="Logo Gaming TADALA FILA"
              className="w-full h-full object-cover rounded-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-extrabold text-[#131b2e] dark:text-[#f1f5f9] font-display text-sm tracking-tight">TADALA FILA</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar itens, marcas ou despensa..."
          className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] dark:bg-[#0f1422] border border-[#e2e8f0] dark:border-[#222b3e] focus:border-[#4338ca] focus:bg-white dark:focus:bg-[#131826] rounded-xl text-sm text-[#131b2e] dark:text-[#f1f5f9] placeholder-[#94a3b8] transition-colors focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#94a3b8] hover:text-[#475569] dark:hover:text-white cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Actions: Admin Status, + Novo Item, Celular */}
      <div className="flex items-center gap-2">
        {/* Admin Status Pill when logged in */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-amber-950/40 dark:to-indigo-950/40 border border-amber-300 dark:border-amber-600/50 text-amber-950 dark:text-amber-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[11px] font-bold text-[#131b2e] dark:text-amber-100 flex items-center gap-1">
                <span>Admin</span>
                <span className="text-[9px] bg-amber-400 text-amber-950 px-1 py-0.2 rounded font-extrabold">
                  TOTAL
                </span>
              </div>
              <div className="text-[10px] text-[#64748b] dark:text-amber-200/70 truncate max-w-[120px]">
                {adminUser?.email || 'admin'}
              </div>
            </div>
            {onAdminLogout && (
              <button
                type="button"
                onClick={onAdminLogout}
                className="ml-1 p-1 text-[#64748b] dark:text-amber-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
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
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm cursor-pointer whitespace-nowrap ${
            isAdmin
              ? 'bg-[#2a14b4] hover:bg-[#200e94] active:scale-[0.98] text-white'
              : 'bg-[#f1f5f9] dark:bg-[#1a2233] hover:bg-[#e2e8f0] dark:hover:bg-[#222c42] text-[#64748b] dark:text-[#94a3b8] border border-[#cbd5e1] dark:border-[#2a3449]'
          }`}
          title={isAdmin ? 'Adicionar novo item' : 'Apenas o Administrador pode adicionar itens. Clique para fazer login.'}
        >
          {isAdmin ? (
            <Plus className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 stroke-[2.5]" />
          )}
          <span className="hidden sm:inline">Novo Item</span>
        </button>

        {/* Dark / Light Theme Toggle Button */}
        <ThemeToggleButton size="md" />

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

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
    <header className="h-16 bg-white border-b border-[#e2e8f0] px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-20">
      {/* Mobile Menu trigger */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-[#475569] hover:bg-[#f1f5f9] rounded-lg cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-[#131b2e] font-display text-base">Lista</span>
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
          className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm text-[#131b2e] placeholder-[#94a3b8] transition-colors focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#94a3b8] hover:text-[#475569] cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Actions: Admin Status, + Novo Item, Celular */}
      <div className="flex items-center gap-2">
        {/* Admin Status Pill when logged in */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-300 text-amber-950 px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[11px] font-bold text-[#131b2e] flex items-center gap-1">
                <span>Admin</span>
                <span className="text-[9px] bg-amber-400 text-amber-950 px-1 py-0.2 rounded font-extrabold">
                  TOTAL
                </span>
              </div>
              <div className="text-[10px] text-[#64748b] truncate max-w-[120px]">
                {adminUser?.email || 'admin'}
              </div>
            </div>
            {onAdminLogout && (
              <button
                type="button"
                onClick={onAdminLogout}
                className="ml-1 p-1 text-[#64748b] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
              : 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#64748b] border border-[#cbd5e1]'
          }`}
          title={isAdmin ? 'Adicionar novo item' : 'Apenas o Administrador pode adicionar itens. Clique para fazer login.'}
        >
          {isAdmin ? (
            <Plus className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
          )}
          <span className="hidden sm:inline">Novo Item</span>
        </button>

        {/* Device Profile / User Badge */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-[#e2e8f0]">
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#faf8ff] hover:bg-[#f2f3ff] border border-[#eaedff] transition-colors cursor-pointer"
            title={`Aparelho identificado como: ${userLabel}.`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#2a14b4] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <span className="block text-xs font-bold text-[#131b2e] truncate max-w-[110px]">
                {userLabel}
              </span>
              <span className="text-[10px] text-[#64748b] font-medium flex items-center gap-1">
                {isAdmin ? '👑 Admin' : '👀 Visualizador'}
              </span>
            </div>
          </button>

          {user && !user.isAnonymous && (
            <button
              onClick={onSignOut}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748b] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
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

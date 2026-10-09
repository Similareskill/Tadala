import React from 'react';
import { X, User, Smartphone, Tablet, CheckCircle, ShieldCheck } from 'lucide-react';
import { AppSettings } from '../types/shopping';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  totalProducts: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  settings,
  totalProducts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0]">
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#2a14b4] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <h3 className="font-bold text-base text-[#131b2e] leading-snug">
                Leandro Temóteo
              </h3>
              <p className="text-xs text-[#64748b]">leandrotemoteo123@gmail.com</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-[#131b2e] hover:bg-[#f1f5f9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Household Info */}
          <div className="bg-[#faf8ff] p-3 rounded-xl border border-[#eaedff]">
            <span className="text-[#64748b] block font-medium">Residência Ativa</span>
            <span className="font-bold text-sm text-[#1e1b4b]">{settings.householdName}</span>
          </div>

          {/* Connected Devices */}
          <div>
            <span className="font-bold text-[#334155] block mb-2">
              Dispositivos Sincronizados ({settings.autoSync ? '3 Ativos' : 'Pausado'})
            </span>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#e2e8f0] bg-white">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-[#2a14b4]" />
                  <span className="font-medium text-[#131b2e]">iPhone 15 Pro (Este aparelho)</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#e2e8f0] bg-white">
                <div className="flex items-center gap-2.5">
                  <Tablet className="w-4 h-4 text-[#475569]" />
                  <span className="font-medium text-[#131b2e]">iPad Cozinha</span>
                </div>
                <span className="text-[11px] text-[#64748b]">Sincronizado há 10 min</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
              <span className="text-[11px] text-[#64748b] block">Itens na Lista</span>
              <span className="text-lg font-bold text-[#131b2e] tabular-nums font-display">
                {totalProducts} produtos
              </span>
            </div>
            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
              <span className="text-[11px] text-[#64748b] block">Status de Nuvem</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Sincronizado
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#f1f5f9] flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#2a14b4] text-white font-semibold text-xs rounded-xl hover:bg-[#200e94] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

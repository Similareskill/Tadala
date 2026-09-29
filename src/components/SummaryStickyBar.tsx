import React from 'react';
import { ShoppingCart, Check, ArrowRight } from 'lucide-react';
import { formatCurrency, playHapticSound } from '../utils/helpers';

interface SummaryStickyBarProps {
  totalItems: number;
  cartCount: number;
  totalUnits: number;
  totalEstimatedPrice: number;
  currencySymbol: string;
  onFinishShopping: () => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
}

export const SummaryStickyBar: React.FC<SummaryStickyBarProps> = ({
  totalItems,
  cartCount,
  totalUnits,
  totalEstimatedPrice,
  currencySymbol,
  onFinishShopping,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const percentComplete = totalItems > 0 ? Math.round((cartCount / totalItems) * 100) : 0;

  const handleFinish = () => {
    if (!isAdmin) {
      onRequireAdmin?.('finalizar compras e arquivar no histórico');
      return;
    }
    playHapticSound('toggle');
    onFinishShopping();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] shadow-lg px-4 py-3 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Progress & Items Count */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-[#faf8ff] border border-[#eaedff] text-[#2a14b4] flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#131b2e]">
                {cartCount} de {totalItems} no carrinho
              </span>
              <span className="text-[11px] text-[#64748b] tabular-nums">
                ({percentComplete}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-40 sm:w-48 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#059669] transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pricing & Checkout Action */}
        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
          <div className="text-right">
            <span className="text-[11px] text-[#64748b] block font-medium">Total Estimado</span>
            <span className="text-base sm:text-lg font-bold text-[#2a14b4] font-display tabular-nums">
              {formatCurrency(totalEstimatedPrice, currencySymbol)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            disabled={cartCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006c4a] hover:bg-[#005137] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Finalizar Compra ({cartCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

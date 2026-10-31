import React from 'react';
import { Trash2, CheckCheck, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface BulkActionToolbarProps {
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  collectedCount: number;
  totalVisibleCount: number;
  onToggleSelectAll: () => void;
  onMarkSelectedAsCollected: () => void;
  onDeleteSelected: () => void;
  onAddNewItem?: () => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  allSelected,
  someSelected,
  selectedCount,
  collectedCount,
  onToggleSelectAll,
  onMarkSelectedAsCollected,
  onDeleteSelected,
  onAddNewItem,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const { currentButtonColor, getButtonGradient, getButtonTextColor } = useTheme();
  return (
    <div className="flex flex-wrap items-center justify-between text-xs text-[#8e9cb3] px-1 py-1 gap-2">
      {/* Selection info */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-[#8e9cb3] hover:text-[#f3e8c7] transition-colors">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected && !allSelected;
            }}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded border-[#2e394e] text-[#c5a059] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#c5a059] bg-[#0c1018]"
          />
          <span className="font-cinzel text-xs">Selecionar todos</span>
        </label>
        <span className="text-[#2e394e]">•</span>
        <span className="text-[#8e9cb3]">
          {collectedCount} marcados como coletados
        </span>
        {selectedCount > 0 && (
          <span className="font-bold text-[#c5a059] bg-[#161d2d] px-2.5 py-0.5 rounded-full border border-[#c5a059]/40 shadow-xs">
            {selectedCount} selecionados
          </span>
        )}
        {onAddNewItem && (
          <button
            type="button"
            onClick={() => {
              if (!isAdmin) {
                onRequireAdmin?.('adicionar itens à lista');
                return;
              }
              onAddNewItem();
            }}
            style={currentButtonColor ? { background: getButtonGradient(currentButtonColor), color: getButtonTextColor(currentButtonColor), borderColor: `${currentButtonColor}aa` } : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] rounded-xl font-bold font-cinzel text-xs shadow-md shadow-black/40 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar à lista</span>
          </button>
        )}
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          onClick={() => {
            if (!isAdmin) {
              onRequireAdmin?.('marcar itens como comprados');
              return;
            }
            onMarkSelectedAsCollected();
          }}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 font-bold font-cinzel text-[#34d399] hover:text-[#6ee7b7] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <CheckCheck className="w-4 h-4 text-[#34d399]" />
          <span>Marcar selecionados</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isAdmin) {
              onRequireAdmin?.('excluir itens da lista');
              return;
            }
            onDeleteSelected();
          }}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 font-bold font-cinzel text-[#f87171] hover:text-[#fca5a5] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  );
};

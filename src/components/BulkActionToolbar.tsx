import React from 'react';
import { Trash2, CheckCheck, Plus } from 'lucide-react';

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
  return (
    <div className="flex flex-wrap items-center justify-between text-xs text-[#64748b] px-1 py-1 gap-2">
      {/* Selection info */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-[#475569] hover:text-[#1e293b]">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected && !allSelected;
            }}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded border-[#cbd5e1] text-[#2a14b4] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#2a14b4]"
          />
          <span>Selecionar todos</span>
        </label>
        <span className="text-[#cbd5e1]">•</span>
        <span className="text-[#64748b]">
          {collectedCount} marcados como coletados
        </span>
        {selectedCount > 0 && (
          <span className="font-semibold text-[#2a14b4] bg-[#faf8ff] px-2 py-0.5 rounded-full border border-[#eaedff]">
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
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2a14b4] hover:bg-[#200e94] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
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
          className="flex items-center gap-1.5 font-semibold text-[#334155] hover:text-[#006c4a] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <CheckCheck className="w-4 h-4 text-[#006c4a]" />
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
          className="flex items-center gap-1.5 font-semibold text-[#ef4444] hover:text-[#b91c1c] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  );
};

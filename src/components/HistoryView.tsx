import React, { useState } from 'react';
import {
  History,
  Calendar,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Check,
  Lock,
  KeyRound,
} from 'lucide-react';
import { ShoppingHistoryEntry, ShoppingItem } from '../types/shopping';
import { formatDate } from '../utils/helpers';

interface HistoryViewProps {
  history: ShoppingHistoryEntry[];
  currencySymbol?: string;
  onRestoreItems: (items: ShoppingItem[]) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onNavigateToList: () => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRestoreItems,
  onDeleteHistoryEntry,
  onNavigateToList,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(history[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b] mb-1">
            <span>Despensa Central</span>
            <span>&gt;</span>
            <span className="text-[#131b2e]">Histórico</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#131b2e] font-display">
            Histórico
          </h2>
          <p className="text-xs text-[#64748b] mt-1">
            Veja os registros anteriores e reponha itens na lista ativa com 1 clique.
          </p>
        </div>

        <button
          onClick={onNavigateToList}
          className="self-start sm:self-auto px-4 py-2 bg-[#faf8ff] text-[#2a14b4] border border-[#eaedff] hover:bg-[#eaedff] rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Voltar para Lista Ativa
        </button>
      </div>

      {/* Non-admin read-only notice banner */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block text-amber-950">
                Histórico em Modo Somente Leitura
              </span>
              <span className="text-amber-800 text-xs">
                Apenas o Administrador pode repor itens do histórico na lista ativa ou excluir registros.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRequireAdmin?.('repor ou excluir histórico')}
            className="self-stretch sm:self-auto px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login de Administrador</span>
          </button>
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#faf8ff] text-[#2a14b4] flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#131b2e] mb-1">Nenhum histórico registrado</h3>
          <p className="text-xs text-[#64748b] mb-4">
            Quando você concluir suas compras na lista ativa, elas ficarão guardadas aqui para consulta.
          </p>
          <button
            onClick={onNavigateToList}
            className="px-4 py-2 bg-[#2a14b4] text-white rounded-xl text-xs font-semibold"
          >
            Ir para a Lista
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-[#e2e8f0] transition-all overflow-hidden shadow-xs hover:border-[#cbd5e1]"
              >
                {/* Entry Summary Bar */}
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#faf8ff]/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] text-[#006c4a] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#131b2e]">{entry.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#64748b] mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(entry.date)}</span>
                        <span>•</span>
                        <span>{entry.itemsCount} produtos ({entry.totalUnits} un)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#f1f5f9]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            onRequireAdmin?.('repor itens do histórico na lista');
                            return;
                          }
                          onRestoreItems(entry.items);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                          isAdmin
                            ? 'bg-[#2a14b4] hover:bg-[#200e94] text-white'
                            : 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#64748b] border border-[#cbd5e1]'
                        }`}
                        title={
                          isAdmin
                            ? 'Adicionar todos estes produtos de volta à lista ativa'
                            : 'Apenas Administrador pode repor itens'
                        }
                      >
                        {isAdmin ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3 h-3 text-amber-700" />
                        )}
                        <span>Repor Lista</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            onRequireAdmin?.('excluir registros do histórico');
                            return;
                          }
                          onDeleteHistoryEntry(entry.id);
                        }}
                        className="p-2 text-[#94a3b8] hover:text-[#ef4444] rounded-xl hover:bg-[#fee2e2]/40 transition-colors cursor-pointer"
                        title={isAdmin ? "Excluir este registro" : "Apenas Administrador pode excluir do histórico"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="text-[#94a3b8]">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Item List */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-[#f1f5f9] bg-[#f8fafc]/50">
                    <h4 className="text-xs font-bold text-[#475569] mb-3">
                      Itens desta compra ({entry.items.length}):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {entry.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-2.5 rounded-xl border border-[#e2e8f0] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                item.status === 'no_carrinho'
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-400'
                              }`}
                            ></span>
                            <span className="font-semibold text-[#1e293b] truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.5 rounded shrink-0">
                              {item.category}
                            </span>
                            {/* Status badge: Concluído / Pendente */}
                            {item.status === 'no_carrinho' ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#82f5c1]/30 text-[#00714e] border border-[#82f5c1]/60 flex items-center gap-0.5 shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                Concluído
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0] shrink-0">
                                Pendente
                              </span>
                            )}
                            {item.brandOrPreference && (
                              <span className="text-[10px] text-[#2a14b4] bg-[#eaedff] border border-[#d2d9f4] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-1">
                                <span className="text-[#64748b] font-normal">Marca:</span>
                                <span>{item.brandOrPreference}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[#475569] shrink-0 font-medium tabular-nums">
                            <span>
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

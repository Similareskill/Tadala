import React from 'react';
import { RefreshCw, BookmarkPlus, Smartphone, CheckCircle2 } from 'lucide-react';

interface SyncFooterProps {
  onNavigateHistory: () => void;
  onClearCollected: () => void;
  onOpenImport: () => void;
  onSaveCopyToHistory: () => void;
  collectedCount: number;
  onOpenShareModal?: () => void;
}

export const SyncFooter: React.FC<SyncFooterProps> = ({
  onNavigateHistory,
  onClearCollected,
  onOpenImport,
  onSaveCopyToHistory,
  collectedCount,
  onOpenShareModal,
}) => {
  return (
    <div className="bg-[#faf8ff] border border-[#eaedff] rounded-2xl p-5 mt-6 transition-all">
      <div className="flex items-start gap-3">
        <div className="text-[#2a14b4] mt-0.5 shrink-0">
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-xs text-[#131b2e] flex items-center gap-1.5">
              <span>Sincronização em Tempo Real</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            </h4>
          </div>

          <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
            A lista sincroniza automaticamente com todos os celulares, tablets ou computadores da sua residência sem necessidade de senha nem bloqueios.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs font-semibold">
            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="bg-[#2a14b4] hover:bg-[#200e94] text-white px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Abrir no celular ou tablet sem senha"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Abrir no Celular
              </button>
            )}

            <button
              type="button"
              onClick={onSaveCopyToHistory}
              className="text-[#2a14b4] hover:underline cursor-pointer font-bold inline-flex items-center gap-1.5 bg-[#eaedff]/60 hover:bg-[#eaedff] px-2.5 py-1 rounded-lg transition-colors"
              title="Salvar um instantâneo desta lista de compras no Histórico"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Copiar Lista para o Histórico
            </button>
            <span className="text-[#cbd5e1]">•</span>
            <button
              type="button"
              onClick={onOpenImport}
              className="text-[#2a14b4] hover:underline cursor-pointer font-medium"
            >
              Importar Cópia
            </button>
            <span className="text-[#cbd5e1]">•</span>
            <button
              type="button"
              onClick={onNavigateHistory}
              className="text-[#2a14b4] hover:underline cursor-pointer"
            >
              Histórico
            </button>
            <span className="text-[#cbd5e1]">•</span>
            <button
              type="button"
              onClick={onClearCollected}
              disabled={collectedCount === 0}
              className="text-[#e11d48] hover:underline disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Limpar Coletados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

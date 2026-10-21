import React, { useState } from 'react';
import { RefreshCw, BookmarkPlus, Smartphone, CheckCircle2, Wifi } from 'lucide-react';

interface SyncFooterProps {
  onNavigateHistory: () => void;
  onClearCollected: () => void;
  onOpenImport: () => void;
  onSaveCopyToHistory: () => void;
  collectedCount: number;
  onOpenShareModal?: () => void;
  onForceResync?: () => Promise<void> | void;
}

export const SyncFooter: React.FC<SyncFooterProps> = ({
  onNavigateHistory,
  onClearCollected,
  onOpenImport,
  onSaveCopyToHistory,
  collectedCount,
  onOpenShareModal,
  onForceResync,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onForceResync) {
        await onForceResync();
      }
      setSyncFeedback('Sincronizado!');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Tentando...');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-[#faf8ff] dark:bg-[#151c2e] border border-[#eaedff] dark:border-[#243048] rounded-2xl p-5 mt-6 transition-all">
      <div className="flex items-start gap-3">
        <div className="text-[#2a14b4] dark:text-indigo-400 mt-0.5 shrink-0">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-xs text-[#131b2e] dark:text-[#f1f5f9] flex items-center gap-1.5">
              <span>Sincronização em Tempo Real (Multi-Dispositivos)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Conexão ativa"></span>
            </h4>

            {onForceResync && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="text-[11px] font-bold text-[#2a14b4] dark:text-indigo-400 hover:bg-[#eaedff] dark:hover:bg-[#1e293b] px-2.5 py-1 rounded-lg border border-[#dbe1ff] dark:border-[#334155] inline-flex items-center gap-1 cursor-pointer transition-colors"
                title="Forçar atualização e sincronizar todos os dispositivos agora"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#2a14b4]' : ''}`} />
                <span>{syncFeedback || (isSyncing ? 'Sincronizando...' : 'Sincronizar Agora')}</span>
              </button>
            )}
          </div>

          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
            A lista, status e check-ins sincronizam automaticamente entre todos os celulares, tablets e computadores em tempo real pelo banco de dados central na nuvem, sem perdas nem bloqueios.
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
              className="text-[#2a14b4] dark:text-indigo-300 hover:underline cursor-pointer font-bold inline-flex items-center gap-1.5 bg-[#eaedff]/60 dark:bg-[#1e293b] hover:bg-[#eaedff] dark:hover:bg-[#283548] px-2.5 py-1 rounded-lg transition-colors"
              title="Salvar um instantâneo desta lista de compras no Histórico"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Copiar Lista para o Histórico
            </button>
            <span className="text-[#cbd5e1] dark:text-[#334155]">•</span>
            <button
              type="button"
              onClick={onOpenImport}
              className="text-[#2a14b4] dark:text-indigo-300 hover:underline cursor-pointer font-medium"
            >
              Importar Cópia
            </button>
            <span className="text-[#cbd5e1] dark:text-[#334155]">•</span>
            <button
              type="button"
              onClick={onNavigateHistory}
              className="text-[#2a14b4] dark:text-indigo-300 hover:underline cursor-pointer"
            >
              Histórico
            </button>
            <span className="text-[#cbd5e1] dark:text-[#334155]">•</span>
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


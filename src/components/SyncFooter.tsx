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
    <div className="bg-[#0e1420]/90 backdrop-blur-md border border-[#242e42] hover:border-[#c5a059]/40 rounded-2xl p-5 mt-6 transition-all shadow-xl shadow-black/50">
      <div className="flex items-start gap-3">
        <div className="text-[#c5a059] mt-0.5 shrink-0">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-xs text-[#f3e8c7] font-cinzel tracking-wider flex items-center gap-1.5">
              <span>Sincronização em Tempo Real (Multi-Dispositivos)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Conexão ativa"></span>
            </h4>

            {onForceResync && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="text-[11px] font-bold font-cinzel text-[#c5a059] bg-[#141b2a] hover:bg-[#1a2336] px-2.5 py-1 rounded-lg border border-[#c5a059]/40 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Forçar atualização e sincronizar todos os dispositivos agora"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#c5a059]' : ''}`} />
                <span>{syncFeedback || (isSyncing ? 'Sincronizando...' : 'Sincronizar Agora')}</span>
              </button>
            )}
          </div>

          <p className="text-xs text-[#8e9cb3] mt-1 leading-relaxed">
            A lista de craft, status de combate e boss check-ins sincronizam automaticamente entre todos os celulares, tablets e computadores em tempo real pela nuvem da guilda.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs font-semibold">
            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] px-3 py-1 rounded-lg text-xs font-bold font-cinzel inline-flex items-center gap-1.5 shadow-md shadow-black/40 cursor-pointer transition-all active:scale-95"
                title="Abrir no celular ou tablet sem senha"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Abrir no Celular
              </button>
            )}

            <button
              type="button"
              onClick={onSaveCopyToHistory}
              className="text-[#c5a059] hover:underline cursor-pointer font-bold font-cinzel inline-flex items-center gap-1.5 bg-[#141b2a] hover:bg-[#1a2336] border border-[#2a374e] px-2.5 py-1 rounded-lg transition-colors"
              title="Salvar um instantâneo desta lista de craft no Histórico"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Copiar Lista para o Histórico
            </button>
            <span className="text-[#2a374e]">•</span>
            <button
              type="button"
              onClick={onOpenImport}
              className="text-[#c5a059] hover:text-[#dfb96c] hover:underline cursor-pointer font-medium font-cinzel"
            >
              Importar Cópia
            </button>
            <span className="text-[#2a374e]">•</span>
            <button
              type="button"
              onClick={onNavigateHistory}
              className="text-[#c5a059] hover:text-[#dfb96c] hover:underline cursor-pointer font-medium font-cinzel"
            >
              Histórico
            </button>
            <span className="text-[#2a374e]">•</span>
            <button
              type="button"
              onClick={onClearCollected}
              disabled={collectedCount === 0}
              className="text-[#f87171] hover:text-[#fca5a5] hover:underline disabled:opacity-40 disabled:pointer-events-none cursor-pointer font-cinzel"
            >
              Limpar Coletados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


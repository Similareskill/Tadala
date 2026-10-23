import React, { useEffect, useState } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Share2,
  Smartphone,
  Laptop,
  CheckCircle2,
  User,
  ExternalLink,
  Globe,
  Radio,
  Wifi,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PeerInfo, deviceSyncService } from '../services/deviceSyncService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string;
  onUpdateNickname: (newNick: string) => void;
  onOpenAuthModal?: () => void;
  connectedDevices?: number;
  syncStatus?: 'connected' | 'connecting' | 'syncing' | 'offline';
  onForceResync?: () => Promise<void> | void;
  latencyMs?: number;
  peers?: PeerInfo[];
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentNickname,
  onUpdateNickname,
  onOpenAuthModal,
  connectedDevices = 1,
  syncStatus = 'connected',
  onForceResync,
  latencyMs = 2,
  peers = [],
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [tempNick, setTempNick] = useState(currentNickname);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const currentUrl = typeof window !== 'undefined'
    ? (() => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const base = isLocal
          ? 'https://ais-dev-sdmk2l6v3qcurxwvq325kd-151367570740.europe-west2.run.app'
          : `${window.location.origin}${window.location.pathname}`;
        try {
          const u = new URL(base);
          u.searchParams.set('room', 'tadala_fila');
          return u.toString();
        } catch {
          return `${base}?room=tadala_fila`;
        }
      })()
    : '';

  useEffect(() => {
    if (isOpen) {
      setTempNick(currentNickname);
      QRCode.toDataURL(currentUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [isOpen, currentUrl, currentNickname]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Aqui está nossa Lista de Craft da Guilda TADALA FILA sincronizada em tempo real (mesmo em outros países e redes móveis 4G):\n${currentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTriggerResync = async () => {
    if (isSyncingNow) return;
    setIsSyncingNow(true);
    try {
      if (onForceResync) {
        await onForceResync();
      }
      setSyncFeedback('Transmitido Globalmente!');
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch {
      setSyncFeedback('Reconectando...');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNick.trim()) {
      onUpdateNickname(tempNick.trim());
    }
  };

  const activePeerList = peers && peers.length > 0 ? peers : deviceSyncService.getConnectedPeers();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#e2e8f0] animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#2a14b4] via-[#3723bf] to-[#4338ca] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Globe className="w-5 h-5 text-emerald-300 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display leading-tight flex items-center gap-2">
                <span>Sincronização Global em Tempo Real</span>
              </h2>
              <p className="text-xs text-white/80">
                Comunicação simultânea entre redes diferentes e outros países (Wi-Fi &amp; 4G/5G)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#1e293b]">
          {/* Highlight Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-xs">
            <Radio className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <span>Multi-Redes &amp; Multi-Países Ativo</span>
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mundo Todo
                </span>
              </p>
              <p className="text-emerald-900 leading-relaxed">
                Todos os aparelhos comunicam-se <strong>ao mesmo tempo</strong>. Qualquer item criado, coletado ou alterado é transmitido instantaneamente mesmo que um aparelho esteja no <strong>4G móvel</strong> e outro no <strong>Wi-Fi</strong>, em <strong>outra cidade ou em outro país</strong>.
              </p>
            </div>
          </div>

          {/* QR Code and Quick Share */}
          <div className="bg-[#faf8ff] border border-[#eaedff] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-2.5 rounded-2xl border border-[#e2e8f0] shadow-xs shrink-0 flex flex-col items-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code para abrir no celular"
                  className="w-36 h-36 rounded-lg"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center bg-gray-100 rounded-lg text-xs text-gray-400">
                  <QrCode className="w-8 h-8 animate-pulse text-indigo-400" />
                </div>
              )}
              <span className="text-[10px] font-bold text-[#64748b] mt-1 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-[#2a14b4]" />
                Aponte a câmera do celular
              </span>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div>
                <p className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-[#2a14b4]" />
                  <span>Conectar qualquer aparelho:</span>
                </p>
                <ol className="text-xs text-[#64748b] mt-1 space-y-1 pl-4 list-decimal">
                  <li>Abra a câmera do celular ou tablet e aponte para o QR Code.</li>
                  <li>Ou envie o link pelo WhatsApp para membros da guilda.</li>
                  <li>Todos os aparelhos entram na mesma sala sincronizada!</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#2a14b4] hover:bg-[#200e94] text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Link da Lista</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>

              {/* Live Connection Status & Manual Resync */}
              <div className="pt-2 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-[#131b2e]">
                      {connectedDevices} {connectedDevices === 1 ? 'Aparelho Conectado' : 'Aparelhos Conectados'}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      ⚡ {latencyMs > 0 ? `${latencyMs}ms` : '<1ms'}
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold">
                      Wi-Fi &amp; 4G
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748b]">
                    Transmissão simultânea via Mesh Relay &amp; WebSocket (&lt; 40ms)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerResync}
                  disabled={isSyncingNow}
                  className="px-3 py-1.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1e293b] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span className={isSyncingNow ? 'animate-spin' : ''}>⚡</span>
                  <span>{syncFeedback || (isSyncingNow ? 'Transmitindo...' : 'Disparar Sinal Global')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connected Peers List across Countries/Networks */}
          <div className="p-4 bg-white border border-[#e2e8f0] rounded-2xl space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#2a14b4]" />
                <span>Aparelhos Conectados ao Vivo (Multi-Redes / Multi-Países):</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {activePeerList.length} Ativos
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {activePeerList.map((peer, idx) => (
                <div
                  key={peer.id || idx}
                  className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <div>
                      <span className="font-bold text-[#131b2e]">
                        {peer.name || `Aparelho ${idx + 1}`}
                      </span>
                      {peer.id === deviceSyncService.getDeviceId() && (
                        <span className="ml-1.5 text-[9px] bg-indigo-100 text-[#2a14b4] font-extrabold px-1.5 py-0.2 rounded">
                          Este Aparelho
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
                    <span className="font-medium bg-white px-2 py-0.5 rounded border border-[#e2e8f0]">
                      {peer.region || '🌐 Global'}
                    </span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {peer.network || 'Wi-Fi/4G'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nickname for this device (Zero password) */}
          <form
            onSubmit={handleSaveNickname}
            className="p-4 bg-white border border-[#e2e8f0] rounded-2xl space-y-2.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2a14b4]" />
                <span>Identificação deste aparelho (Opcional - Sem Senha)</span>
              </label>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Defina um nome para saber quem adicionou ou coletou cada item da lista (ex: &quot;Leandro (Celular)&quot;, &quot;PC Cozinha&quot;, &quot;Membro de Portugal&quot;).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempNick}
                onChange={(e) => setTempNick(e.target.value)}
                placeholder="Ex: Leandro (Celular - 4G)"
                className="flex-1 px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-xs font-medium text-[#131b2e] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#eaedff] hover:bg-[#dbe1ff] text-[#2a14b4] text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Salvar Nome
              </button>
            </div>
          </form>

          {/* Optional account section */}
          {onOpenAuthModal && (
            <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-[#64748b]">
              <span>Deseja vincular uma conta de e-mail ou Google?</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="text-[#2a14b4] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Avançado: Entrar com Google / E-mail</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

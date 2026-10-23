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
} from 'lucide-react';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string;
  onUpdateNickname: (newNick: string) => void;
  onOpenAuthModal?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentNickname,
  onUpdateNickname,
  onOpenAuthModal,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [tempNick, setTempNick] = useState(currentNickname);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

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
      `Aqui está nossa Lista de Compras compartilhada em tempo real (sem precisar de senha):\n${currentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNick.trim()) {
      onUpdateNickname(tempNick.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#e2e8f0] animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#2a14b4] to-[#4338ca] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display leading-tight">
                Acesso Sem Senha em Qualquer Aparelho
              </h2>
              <p className="text-xs text-white/80">
                Sincronização em tempo real (Celular, Tablet e Computador)
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
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                <span>100% Livre de Barreiras de Bloqueio</span>
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sem Senha
                </span>
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Qualquer pessoa em qualquer aparelho (celular, tablet ou computador) pode acessar e sincronizar a lista instantaneamente, sem bloqueios, sem telas travadas e sem necessidade de senha ou cadastro.
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
                  <span>Como abrir no celular ou tablet:</span>
                </p>
                <ol className="text-xs text-[#64748b] mt-1 space-y-1 pl-4 list-decimal">
                  <li>Aponte a câmera do seu smartphone para o QR Code ao lado.</li>
                  <li>Ou copie o link direto e envie pelo WhatsApp.</li>
                  <li>A lista abrirá conectada em tempo real na nuvem!</li>
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
            </div>
          </div>

          {/* Nickname for this device (Zero password) */}
          <form
            onSubmit={handleSaveNickname}
            className="p-4 bg-white border border-[#e2e8f0] rounded-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2a14b4]" />
                <span>Identificação deste aparelho (Opcional - Sem Senha)</span>
              </label>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Defina um nome para saber quem adicionou ou coletou cada item da lista (ex: &quot;Leandro&quot;, &quot;Celular da Maria&quot;, &quot;Tablet da Cozinha&quot;).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempNick}
                onChange={(e) => setTempNick(e.target.value)}
                placeholder="Ex: Leandro (Celular)"
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

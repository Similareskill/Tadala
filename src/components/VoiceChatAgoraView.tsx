import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Users,
  PhoneCall,
  PhoneOff,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Shield,
  Swords,
  Flame,
  Crown,
  Share2,
  Globe,
  Headphones,
  Signal,
  Wifi,
  Settings,
  HelpCircle,
  QrCode,
  Smile,
  Volume1,
} from 'lucide-react';
import {
  AGORA_APP_BUILDER_CONFIG,
  PRESET_VOICE_CHANNELS,
  VoiceChannelPreset,
} from '../config/agoraConfig';
import {
  agoraVoiceService,
  VoiceUser,
  ConnectionStatus,
} from '../services/agoraVoiceService';
import { playHapticSound } from '../utils/helpers';

interface VoiceChatAgoraViewProps {
  currentUserNick: string;
  isAdmin?: boolean;
  onShowToast: (msg: string) => void;
  onRequireAdmin?: (reason: string) => void;
}

export const VoiceChatAgoraView: React.FC<VoiceChatAgoraViewProps> = ({
  currentUserNick,
  isAdmin = false,
  onShowToast,
  onRequireAdmin,
}) => {
  const [activeChannel, setActiveChannel] = useState<VoiceChannelPreset>(PRESET_VOICE_CHANNELS[0]);
  const [customChannelInput, setCustomChannelInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceUser[]>([]);
  const [viewMode, setViewMode] = useState<'native' | 'embedded'>('native');
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveReaction, setLiveReaction] = useState<string | null>(null);
  const [isPttPressed, setIsPttPressed] = useState(false);
  const [usePttMode, setUsePttMode] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Sync state with agoraVoiceService
  useEffect(() => {
    const update = () => {
      setConnectionStatus(agoraVoiceService.getStatus());
      setIsMuted(agoraVoiceService.getIsMuted());
      setIsDeafened(agoraVoiceService.getIsDeafened());
      setParticipants(agoraVoiceService.getParticipants(currentUserNick));
    };

    update();
    const unsub = agoraVoiceService.subscribe(update);
    return () => {
      unsub();
    };
  }, [currentUserNick]);

  // Handle joining channel
  const handleConnect = async (channel: VoiceChannelPreset) => {
    playHapticSound('toggle');
    setActiveChannel(channel);
    const success = await agoraVoiceService.join(channel.id, currentUserNick);
    if (success) {
      playHapticSound('success');
      onShowToast(`Conectado à sala de voz "${channel.name}"!`);
    } else {
      playHapticSound('delete');
      onShowToast(`Não foi possível conectar ao microfone/sala. Verifique permissões.`);
    }
  };

  const handleDisconnect = async () => {
    playHapticSound('toggle');
    await agoraVoiceService.leave();
    onShowToast(`Desconectado da sala de voz.`);
  };

  const handleToggleMute = () => {
    playHapticSound('click');
    const state = agoraVoiceService.toggleMute();
    setIsMuted(state);
    onShowToast(state ? 'Microfone Mutado' : 'Microfone Ativado');
  };

  const handleToggleDeafen = () => {
    playHapticSound('click');
    const state = agoraVoiceService.toggleDeafen();
    setIsDeafened(state);
    onShowToast(state ? 'Áudio Ensurdecido' : 'Áudio Restaurado');
  };

  // Push to talk listeners
  useEffect(() => {
    if (!usePttMode || connectionStatus !== 'connected') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsPttPressed(true);
        agoraVoiceService.setPushToTalk(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsPttPressed(false);
        agoraVoiceService.setPushToTalk(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [usePttMode, connectionStatus]);

  // Copy app invite link
  const handleCopyLink = () => {
    const url = AGORA_APP_BUILDER_CONFIG.FRONTEND_ENDPOINT;
    try {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      playHapticSound('click');
      onShowToast('Link do TadalaChatVoz copiado para a área de transferência!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      onShowToast(url);
    }
  };

  // Trigger live reaction
  const handleReaction = (emoji: string) => {
    playHapticSound('toggle');
    setLiveReaction(emoji);
    setTimeout(() => setLiveReaction(null), 2000);
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner / Header with TadalaChatVoz Branding */}
      <div className="bg-gradient-to-r from-[#071326] via-[#091b36] to-[#040c1a] border border-[#00AEFC]/30 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#00AEFC]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-1">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-[#00AEFC]/10 border-2 border-[#00AEFC] p-1 flex items-center justify-center overflow-hidden shadow-lg shadow-[#00AEFC]/20">
                <img
                  src={AGORA_APP_BUILDER_CONFIG.LOGO}
                  alt={AGORA_APP_BUILDER_CONFIG.APP_NAME}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    // Fallback to Tadala logo
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-[#071326] ${isConnected ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
                  <span>{AGORA_APP_BUILDER_CONFIG.APP_NAME}</span>
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#00AEFC]/20 text-[#00AEFC] border border-[#00AEFC]/40 shadow-xs">
                  Agora RTC • {AGORA_APP_BUILDER_CONFIG.AUDIO_ROOM ? 'Áudio Room' : 'Voz'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Plataforma oficial de chat de voz da guilda <strong>{AGORA_APP_BUILDER_CONFIG.CHAT_ORG_NAME}</strong>
              </p>
            </div>
          </div>

          {/* Quick External Actions & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white/10 p-1 rounded-2xl border border-white/15 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('native')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'native'
                    ? 'bg-[#00AEFC] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Painel Integrado</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('embedded')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'embedded'
                    ? 'bg-[#00AEFC] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>voicetadala.vercel.app</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/20 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Copiar link da aplicação TadalaChatVoz"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>

            <a
              href={AGORA_APP_BUILDER_CONFIG.FRONTEND_ENDPOINT}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-2xl bg-[#00AEFC] hover:bg-[#0096dc] text-white text-xs font-bold transition-colors shadow-md shadow-[#00AEFC]/20 cursor-pointer flex items-center gap-1.5"
              title="Abrir no app web independente (Vercel)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir App</span>
            </a>
          </div>
        </div>

        {/* Live Reaction animation overlay */}
        {liveReaction && (
          <div className="absolute right-12 top-4 text-4xl animate-bounce pointer-events-none">
            {liveReaction}
          </div>
        )}
      </div>

      {/* VIEW MODE 1: NATIVE AGORA RTC VOICE ENGINE */}
      {viewMode === 'native' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Channels & Rooms List */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#131826] rounded-3xl border border-[#e2e8f0] dark:border-[#222b3e] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] dark:border-[#1e2638] pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#00AEFC]" />
                  <h3 className="text-sm font-bold text-[#131b2e] dark:text-white">
                    Canais de Voz
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {PRESET_VOICE_CHANNELS.length} Salas
                </span>
              </div>

              {/* Channel list */}
              <div className="space-y-2">
                {PRESET_VOICE_CHANNELS.map((ch) => {
                  const isActive = activeChannel.id === ch.id;
                  const isCurrentConnected = isConnected && isActive;

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleConnect(ch)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrentConnected
                          ? 'border-[#00AEFC] bg-[#00AEFC]/10 ring-2 ring-[#00AEFC]/30 shadow-xs'
                          : isActive
                          ? 'border-[#00AEFC]/50 bg-slate-50 dark:bg-[#182030]'
                          : 'border-[#e2e8f0] dark:border-[#222b3e] hover:border-[#00AEFC]/40 hover:bg-slate-50 dark:hover:bg-[#161c2a]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{ch.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#131b2e] dark:text-white truncate flex items-center gap-1.5">
                            <span>{ch.name}</span>
                            {isCurrentConnected && (
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate mt-0.5">
                            {ch.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isCurrentConnected ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500 text-white">
                            CONECTADO
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#00AEFC] hover:underline">
                            Entrar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Channel Entry */}
              <div className="pt-2 border-t border-[#f1f5f9] dark:border-[#1e2638] space-y-2">
                <label className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8]">
                  Entrar em Sala Personalizada:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customChannelInput}
                    onChange={(e) => setCustomChannelInput(e.target.value)}
                    placeholder="Ex: sala-torean, gvg-tarde"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#2a3449] bg-[#f8fafc] dark:bg-[#131826] text-[#131b2e] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00AEFC]"
                  />
                  <button
                    type="button"
                    disabled={!customChannelInput.trim()}
                    onClick={() => {
                      if (!customChannelInput.trim()) return;
                      const custom: VoiceChannelPreset = {
                        id: customChannelInput.trim().toLowerCase().replace(/\s+/g, '-'),
                        name: customChannelInput.trim(),
                        description: 'Canal personalizado',
                        category: 'Custom',
                        icon: '🔊',
                      };
                      handleConnect(custom);
                      setCustomChannelInput('');
                    }}
                    className="px-3.5 py-2 bg-[#00AEFC] hover:bg-[#0096dc] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>

            {/* Connection Info & Specs Card */}
            <div className="bg-[#f8fafc] dark:bg-[#131826] rounded-3xl border border-[#e2e8f0] dark:border-[#222b3e] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                <span>App ID:</span>
                <span className="font-mono font-bold text-[#131b2e] dark:text-white">
                  {AGORA_APP_BUILDER_CONFIG.APP_ID.slice(0, 10)}...
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                <span>Codec Áudio:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                  {AGORA_APP_BUILDER_CONFIG.SDK_CODEC} (HQ Estéreo)
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                <span>Cancelamento de Ruído:</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                  Ativo (AI ANS)
                </span>
              </div>
            </div>
          </div>

          {/* Center & Right Column: Active Room & Participants Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Voice Bar */}
            <div className="bg-[#111111] rounded-3xl border border-[#262626] p-5 text-white shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#00AEFC]/20 border border-[#00AEFC] flex items-center justify-center text-[#00AEFC] shadow-lg shadow-[#00AEFC]/20">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold font-display">
                        {activeChannel.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-[#00AEFC]">
                        {isConnected ? 'Em Chamada' : 'Aguardando Conexão'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Conectado como <strong>{currentUserNick}</strong>
                    </p>
                  </div>
                </div>

                {/* Main Call Action */}
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-rose-900/30 cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Desconectar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(activeChannel)}
                      className="px-5 py-2.5 bg-[#00AEFC] hover:bg-[#0096dc] text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-[#00AEFC]/30 cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Conectar ao Canal</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Call Controls: Mic, Deafen, PTT, Reactions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Audio controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!isConnected}
                    onClick={handleToggleMute}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 ${
                      isMuted
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                    <span>{isMuted ? 'Mutado' : 'Microfone Ativo'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isConnected}
                    onClick={handleToggleDeafen}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 ${
                      isDeafened
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                    }`}
                  >
                    {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#00AEFC]" />}
                    <span>{isDeafened ? 'Ensurdecido' : 'Áudio Ativo'}</span>
                  </button>

                  {/* Push to talk mode toggle */}
                  <button
                    type="button"
                    disabled={!isConnected}
                    onClick={() => {
                      setUsePttMode(!usePttMode);
                      onShowToast(!usePttMode ? 'Modo Pressione para Falar (Espaço) ativado' : 'Detecção de Voz contínua ativada');
                    }}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border disabled:opacity-40 ${
                      usePttMode
                        ? 'bg-amber-400 text-amber-950 border-amber-300'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                    title="Ativar/desativar modo Pressione para Falar (Tecla Espaço)"
                  >
                    <span>PTT: {usePttMode ? 'Ativo' : 'Desativado'}</span>
                  </button>
                </div>

                {/* Live Reactions Bar */}
                {AGORA_APP_BUILDER_CONFIG.ENABLE_LIVE_REACTIONS && (
                  <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold px-1.5">Reagir:</span>
                    {['🔥', '⚔️', '👑', '🛡️', '👏', '😂'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(emoji)}
                        className="w-7 h-7 rounded-xl hover:bg-white/10 flex items-center justify-center text-sm transition-transform hover:scale-125 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Push to talk active banner */}
              {usePttMode && isConnected && (
                <div
                  onMouseDown={() => {
                    setIsPttPressed(true);
                    agoraVoiceService.setPushToTalk(true);
                  }}
                  onMouseUp={() => {
                    setIsPttPressed(false);
                    agoraVoiceService.setPushToTalk(false);
                  }}
                  className={`p-3 rounded-2xl text-center text-xs font-bold transition-all select-none cursor-pointer border ${
                    isPttPressed
                      ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300/40 animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  {isPttPressed ? (
                    <span>🎙️ TRANSMITINDO ÁUDIO AGORA (Solte para silenciar)</span>
                  ) : (
                    <span>Segure a barra de ESPAÇO ou clique aqui para falar</span>
                  )}
                </div>
              )}
            </div>

            {/* Participants Grid */}
            <div className="bg-white dark:bg-[#131826] rounded-3xl border border-[#e2e8f0] dark:border-[#222b3e] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] dark:border-[#1e2638] pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00AEFC]" />
                  <h3 className="text-sm font-bold text-[#131b2e] dark:text-white">
                    Membros no Canal ({participants.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-[#94a3b8]">
                  <Signal className="w-3.5 h-3.5 text-emerald-500" />
                  <span>HQ Áudio</span>
                </div>
              </div>

              {participants.length === 0 ? (
                <div className="p-8 text-center bg-[#fafbfc] dark:bg-[#0e121d] rounded-2xl border border-dashed border-[#cbd5e1] dark:border-[#263147] space-y-2">
                  <Headphones className="w-8 h-8 text-[#94a3b8] mx-auto" />
                  <p className="text-sm font-bold text-[#1e293b] dark:text-white">
                    {isConnected ? 'Você é o primeiro a entrar nesta sala' : 'Ninguém conectado nesta sala'}
                  </p>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                    {isConnected
                      ? 'Convide outros jogadores da guilda para entrar na chamada de voz!'
                      : 'Clique em "Conectar ao Canal" acima para falar com sua guilda.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {participants.map((user) => (
                    <div
                      key={user.uid}
                      className={`p-4 rounded-2xl border text-center transition-all relative overflow-hidden ${
                        user.isSpeaking
                          ? 'border-[#00AEFC] bg-[#00AEFC]/10 ring-2 ring-[#00AEFC]/40 shadow-md'
                          : 'border-[#e2e8f0] dark:border-[#222b3e] bg-[#f8fafc] dark:bg-[#182030]'
                      }`}
                    >
                      {/* Avatar with live speaking pulse */}
                      <div className="relative w-14 h-14 mx-auto mb-2">
                        <div
                          className={`w-full h-full rounded-2xl flex items-center justify-center font-extrabold text-base transition-all shadow-md ${
                            user.isSpeaking
                              ? 'bg-[#00AEFC] text-white ring-4 ring-[#00AEFC]/30 animate-pulse'
                              : 'bg-indigo-100 dark:bg-indigo-950/60 text-[#2a14b4] dark:text-indigo-300'
                          }`}
                        >
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        {user.isMuted && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                            <MicOff className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-[#131b2e] dark:text-white truncate">
                        {user.name}
                      </div>

                      <div className="text-[10px] mt-0.5 flex items-center justify-center gap-1 font-semibold">
                        {user.isLocal && (
                          <span className="text-[#00AEFC] bg-[#00AEFC]/15 px-1.5 py-0.2 rounded">
                            Você
                          </span>
                        )}
                        {user.isSpeaking ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <Volume2 className="w-3 h-3" />
                            <span>Falando...</span>
                          </span>
                        ) : user.isMuted ? (
                          <span className="text-rose-500">Silenciado</span>
                        ) : (
                          <span className="text-slate-400">Ouvindo</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: EMBEDDED TADALA CHAT VOZ WEB APPLICATION (Vercel) */
        <div className="bg-white dark:bg-[#131826] rounded-3xl border border-[#e2e8f0] dark:border-[#222b3e] overflow-hidden shadow-xl space-y-0">
          <div className="p-4 bg-[#091b36] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00AEFC]" />
              <span className="text-xs font-bold">
                TadalaChatVoz: voicetadala.vercel.app
              </span>
            </div>
            <a
              href={AGORA_APP_BUILDER_CONFIG.FRONTEND_ENDPOINT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00AEFC] hover:underline font-bold flex items-center gap-1"
            >
              <span>Abrir em tela cheia</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative w-full h-[650px] bg-[#111111]">
            <iframe
              src={AGORA_APP_BUILDER_CONFIG.FRONTEND_ENDPOINT}
              title="TadalaChatVoz Web Application"
              allow="camera; microphone; display-capture; autoplay; clipboard-write;"
              className="w-full h-full border-0"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

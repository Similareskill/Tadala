import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Radio,
  Send,
  Paperclip,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Download,
  Trash2,
  Sparkles,
  Crown,
  Users,
  X,
  Maximize2,
  Search,
} from 'lucide-react';
import {
  voiceChatService,
  ChatMessage,
  ChatAttachment,
  VoiceParticipant,
  PRESET_VOICE_ROOMS,
  RTC_ICE_SERVERS,
  WebRTCSignal,
  soundEffects,
} from '../services/voiceChatService';
import { AdminAccount } from '../types/shopping';
import { playHapticSound, formatRelativeTime } from '../utils/helpers';

interface VoiceChatViewProps {
  currentUserNick: string;
  isAdmin: boolean;
  adminUser?: AdminAccount | null;
  onRequireAdmin: (reason?: string) => boolean;
  onShowToast: (msg: string) => void;
}

export const VoiceChatView: React.FC<VoiceChatViewProps> = ({
  currentUserNick,
  isAdmin,
  adminUser: _adminUser,
  onRequireAdmin,
  onShowToast,
}) => {
  const [activeRoomId, setActiveRoomId] = useState<string>('geral-craft');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Voice state
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputMode, setInputMode] = useState<'vad' | 'ptt'>('vad');
  const [isPttPressed, setIsPttPressed] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});

  // Audio Recording (Voice Notes)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Audio Web API refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // WebRTC Mesh Peer Connections & Remote Audios
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());

  // Lightbox Modal for previewing images
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Unique participant ID per session / device so multiple devices never collide
  const participantIdRef = useRef<string>(
    (() => {
      try {
        const stored = sessionStorage.getItem('shopping_voice_session_id');
        if (stored) return stored;
      } catch {}
      const newId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      try {
        sessionStorage.setItem('shopping_voice_session_id', newId);
      } catch {}
      return newId;
    })()
  );

  const activeRoom = PRESET_VOICE_ROOMS.find((r) => r.id === activeRoomId) || PRESET_VOICE_ROOMS[0];

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = voiceChatService.subscribeMessages(activeRoomId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeRoomId]);

  // Subscribe to real-time voice participants (isolated per document)
  useEffect(() => {
    const unsub = voiceChatService.subscribeRoomParticipants(activeRoomId, (parts) => {
      setParticipants(parts);
    });
    return () => unsub();
  }, [activeRoomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAttachments]);

  // Flush queued ICE candidates for a peer connection once remote description is set
  const flushPendingCandidates = async (remoteId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(remoteId);
    if (!queued || queued.length === 0) return;
    pendingCandidatesRef.current.delete(remoteId);

    for (const c of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn('Notice adding queued ICE candidate for peer:', remoteId, err);
      }
    }
  };

  // Create or retrieve an RTCPeerConnection for a remote device
  const getOrCreatePeerConnection = (remoteId: string): RTCPeerConnection => {
    const existing = peerConnectionsRef.current.get(remoteId);
    if (
      existing &&
      existing.connectionState !== 'closed' &&
      existing.connectionState !== 'failed'
    ) {
      return existing;
    }

    if (existing) {
      try {
        existing.close();
      } catch {}
      peerConnectionsRef.current.delete(remoteId);
    }

    const pc = new RTCPeerConnection(RTC_ICE_SERVERS);
    peerConnectionsRef.current.set(remoteId, pc);

    // Add local microphone audio tracks immediately if stream is active
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((track) => {
        try {
          pc.addTrack(track, audioStreamRef.current!);
        } catch {}
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        voiceChatService.sendSignal(activeRoomId, {
          from: participantIdRef.current,
          to: remoteId,
          type: 'candidate',
          data: JSON.stringify(event.candidate.toJSON()),
        });
      }
    };

    // Remote Audio stream arrived
    pc.ontrack = (event) => {
      let audio = remoteAudiosRef.current.get(remoteId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (audio as any).playsInline = true;
        remoteAudiosRef.current.set(remoteId, audio);
      }
      audio.srcObject = event.streams[0];
      const vol = userVolumes[remoteId] ?? 100;
      audio.volume = isDeafened ? 0 : vol / 100;
      
      audio.play().catch(() => {
        // Fallback for mobile browser autoplay policy: play on first user tap/click
        const unlockAudio = () => {
          audio?.play().catch(() => {});
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        const audio = remoteAudiosRef.current.get(remoteId);
        if (audio) {
          audio.pause();
          audio.srcObject = null;
          remoteAudiosRef.current.delete(remoteId);
        }
        peerConnectionsRef.current.delete(remoteId);
        pendingCandidatesRef.current.delete(remoteId);
      }
    };

    return pc;
  };

  // WebRTC Signaling listener when inside a voice room
  useEffect(() => {
    if (!isInVoiceCall) return;

    const unsub = voiceChatService.subscribeSignals(
      activeRoomId,
      participantIdRef.current,
      async (signal: WebRTCSignal) => {
        try {
          const pc = getOrCreatePeerConnection(signal.from);

          if (signal.type === 'offer') {
            const desc = new RTCSessionDescription(JSON.parse(signal.data));
            const isPolite = participantIdRef.current < signal.from;
            const isColliding =
              makingOfferRef.current.get(signal.from) || pc.signalingState !== 'stable';

            // Impolite peer ignores offer collision (avoids glare deadlocks)
            if (isColliding && !isPolite) {
              return;
            }

            if (isColliding && isPolite) {
              try {
                await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
              } catch {}
            }

            await pc.setRemoteDescription(desc);
            await flushPendingCandidates(signal.from, pc);

            // Re-ensure local tracks are attached before answering
            if (audioStreamRef.current) {
              const senders = pc.getSenders();
              audioStreamRef.current.getAudioTracks().forEach((track) => {
                if (!senders.some((s) => s.track === track)) {
                  try {
                    pc.addTrack(track, audioStreamRef.current!);
                  } catch {}
                }
              });
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await voiceChatService.sendSignal(activeRoomId, {
              from: participantIdRef.current,
              to: signal.from,
              type: 'answer',
              data: JSON.stringify(answer),
            });
          } else if (signal.type === 'answer') {
            const desc = new RTCSessionDescription(JSON.parse(signal.data));
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(desc);
              await flushPendingCandidates(signal.from, pc);
            }
          } else if (signal.type === 'candidate') {
            const candidateInit = JSON.parse(signal.data) as RTCIceCandidateInit;

            // If remote description is not ready yet, queue the candidate!
            if (!pc.remoteDescription || !pc.remoteDescription.type) {
              const queued = pendingCandidatesRef.current.get(signal.from) || [];
              queued.push(candidateInit);
              pendingCandidatesRef.current.set(signal.from, queued);
            } else {
              await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
            }
          }
        } catch (err) {
          console.warn('WebRTC signal processing notice:', err);
        }
      }
    );

    return () => unsub();
  }, [isInVoiceCall, activeRoomId]);

  // Mesh connection orchestrator: establish P2P connection to other connected devices
  useEffect(() => {
    if (!isInVoiceCall) return;

    const connectToOtherDevices = async () => {
      for (const p of participants) {
        if (p.id === participantIdRef.current) continue;

        // Deterministic initiator: the device with greater session ID creates the offer
        if (participantIdRef.current > p.id) {
          const existingPc = peerConnectionsRef.current.get(p.id);
          const needsNegotiation =
            !existingPc ||
            existingPc.connectionState === 'closed' ||
            existingPc.connectionState === 'failed';

          if (needsNegotiation) {
            try {
              makingOfferRef.current.set(p.id, true);
              const pc = getOrCreatePeerConnection(p.id);
              const offer = await pc.createOffer({ offerToReceiveAudio: true });
              await pc.setLocalDescription(offer);

              await voiceChatService.sendSignal(activeRoomId, {
                from: participantIdRef.current,
                to: p.id,
                type: 'offer',
                data: JSON.stringify(offer),
              });
            } catch (err) {
              console.warn('Offer creation notice for peer:', p.id, err);
            } finally {
              makingOfferRef.current.set(p.id, false);
            }
          }
        }
      }
    };

    connectToOtherDevices();
  }, [isInVoiceCall, participants, activeRoomId]);

  // Sync mute state with local audio tracks
  useEffect(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted && !isDeafened;
      });
    }
  }, [isMuted, isDeafened]);

  // Sync deafen state with all remote audio outputs
  useEffect(() => {
    remoteAudiosRef.current.forEach((audio, remoteId) => {
      const vol = userVolumes[remoteId] ?? 100;
      audio.volume = isDeafened ? 0 : vol / 100;
    });
  }, [isDeafened, userVolumes]);

  // Web Audio API for Live Voice activity, frequency bars & speaking detection
  useEffect(() => {
    if (!isInVoiceCall) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      // Close peer connections and audio elements
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      remoteAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      remoteAudiosRef.current.clear();

      setMicVolumeLevel(0);
      setIsSpeaking(false);
      return;
    }

    let isCancelled = false;

    const startMic = async () => {
      try {
        let stream = audioStreamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          audioStreamRef.current = stream;
        }

        // Apply mute/deafen settings to tracks immediately
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted && !isDeafened;
        });

        // Add tracks to any existing peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          stream!.getAudioTracks().forEach((track) => {
            if (!senders.some((s) => s.track === track)) {
              try {
                pc.addTrack(track, stream!);
              } catch {}
            }
          });
        });

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = audioContextRef.current && audioContextRef.current.state !== 'closed'
          ? audioContextRef.current
          : new AudioCtx();
        audioContextRef.current = ctx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudio = () => {
          if (isCancelled || !audioStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));

          setMicVolumeLevel(normalized);

          const currentlySpeaking =
            !isMuted &&
            !isDeafened &&
            (inputMode === 'ptt' ? isPttPressed : normalized > 16);

          setIsSpeaking(currentlySpeaking);

          // Update speaking status in Firestore document for THIS device
          voiceChatService.updateVoiceState(activeRoomId, participantIdRef.current, {
            isSpeaking: currentlySpeaking,
            isMuted,
            isDeafened,
          });

          animFrameRef.current = requestAnimationFrame(checkAudio);
        };

        checkAudio();
      } catch (err) {
        console.warn('Microphone access notice:', err);
        onShowToast('Microfone não acessível. Você ainda pode ouvir os outros membros e usar o chat!');
      }
    };

    startMic();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isInVoiceCall, isMuted, isDeafened, inputMode, isPttPressed, activeRoomId]);

  // Periodic heartbeat while in voice room to keep isolated participant doc active
  useEffect(() => {
    if (!isInVoiceCall) return;

    const interval = setInterval(() => {
      voiceChatService.updateVoiceState(activeRoomId, participantIdRef.current, {
        isMuted,
        isDeafened,
        isSpeaking,
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [isInVoiceCall, activeRoomId, isMuted, isDeafened, isSpeaking]);

  // Window beforeunload listener to gracefully exit the voice room on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInVoiceCall) {
        voiceChatService.leaveVoiceRoom(activeRoomId, participantIdRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isInVoiceCall) {
        voiceChatService.leaveVoiceRoom(activeRoomId, participantIdRef.current);
      }
    };
  }, [isInVoiceCall, activeRoomId]);

  // Push-to-talk Spacebar keyboard listener
  useEffect(() => {
    if (!isInVoiceCall || inputMode !== 'ptt') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsPttPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPttPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInVoiceCall, inputMode]);

  // Connect to voice room
  const handleJoinVoice = async () => {
    playHapticSound('toggle');

    // 1. Acquire mic permission and stream first, ensuring local tracks exist when offers/answers are created
    let stream = audioStreamRef.current;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioStreamRef.current = stream;
      } catch (err) {
        console.warn('Microphone access notice:', err);
        onShowToast('Microfone não acessível. Você ainda pode ouvir os outros membros da chamada!');
      }
    }

    // 2. Unlock AudioContext on direct user gesture for all devices (including iOS Safari and Android Chrome)
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume().catch(() => {});
        }
      }
    } catch {}

    const role = isAdmin ? 'admin' : 'member';
    const participant: VoiceParticipant = {
      id: participantIdRef.current,
      name: currentUserNick || (isAdmin ? 'Admin' : 'Membro'),
      role,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      joinedAt: new Date().toISOString(),
      lastPing: Date.now(),
    };

    await voiceChatService.joinVoiceRoom(activeRoomId, participant);
    setIsInVoiceCall(true);
    setIsMuted(false);
    setIsDeafened(false);
    onShowToast(`Conectado à sala de voz: ${activeRoom.name}`);
  };

  // Leave voice room
  const handleLeaveVoice = async () => {
    playHapticSound('toggle');
    await voiceChatService.leaveVoiceRoom(activeRoomId, participantIdRef.current);

    // Clean peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    remoteAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

    setIsInVoiceCall(false);
    setIsSpeaking(false);
    onShowToast('Desconectado da sala de voz.');
  };

  // Toggle Mute
  const handleToggleMute = () => {
    playHapticSound('click');
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEffects.playMute(nextMuted);
    voiceChatService.updateVoiceState(activeRoomId, participantIdRef.current, {
      isMuted: nextMuted,
    });
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    playHapticSound('click');
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    if (nextDeafened) {
      setIsMuted(true);
    }
    soundEffects.playMute(nextDeafened);
    voiceChatService.updateVoiceState(activeRoomId, participantIdRef.current, {
      isDeafened: nextDeafened,
      isMuted: nextDeafened ? true : isMuted,
    });
  };

  // Adjust volume for a specific remote participant
  const handleUserVolumeChange = (userId: string, volumePercent: number) => {
    setUserVolumes((prev) => ({ ...prev, [userId]: volumePercent }));
    const audio = remoteAudiosRef.current.get(userId);
    if (audio) {
      audio.volume = isDeafened ? 0 : volumePercent / 100;
    }
  };

  // Voice Note Recording
  const startRecordingAudio = async () => {
    try {
      playHapticSound('click');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const attachment: ChatAttachment = {
            id: `audio_${Date.now()}`,
            name: `Áudio_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
            type: 'audio',
            mimeType: 'audio/webm',
            url: base64Audio,
            size: audioBlob.size,
          };
          setPendingAttachments((prev) => [...prev, attachment]);
          onShowToast('Áudio gravado com sucesso! Clique em Enviar.');
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      onShowToast('Não foi possível acessar o microfone para gravar áudio.');
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      playHapticSound('click');
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      playHapticSound('click');
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      onShowToast('Gravação cancelada.');
    }
  };

  // Convert File to Base64 ChatAttachment
  const processUploadedFile = (file: File): Promise<ChatAttachment> => {
    return new Promise((resolve, reject) => {
      if (file.size > 8 * 1024 * 1024) {
        onShowToast(`O arquivo "${file.name}" excede o limite de 8 MB.`);
        reject(new Error('File too large'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        let fileType: ChatAttachment['type'] = 'file';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('audio/')) fileType = 'audio';

        resolve({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: fileType,
          mimeType: file.type || 'application/octet-stream',
          url: reader.result as string,
          size: file.size,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file input changes
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    playHapticSound('click');
    const newAttachments: ChatAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const att = await processUploadedFile(files[i]);
        newAttachments.push(att);
      } catch (err) {
        console.error('File process error:', err);
      }
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    playHapticSound('click');
    const newAttachments: ChatAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const att = await processUploadedFile(files[i]);
        newAttachments.push(att);
      } catch (err) {
        console.error('Drop file error:', err);
      }
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
  };

  // Handle Paste (Ctrl+V) from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          playHapticSound('click');
          try {
            const att = await processUploadedFile(file);
            setPendingAttachments((prev) => [...prev, att]);
            onShowToast('Imagem da área de transferência anexada!');
          } catch {}
        }
      }
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();

    if (!cleanText && pendingAttachments.length === 0) return;

    setIsSending(true);
    playHapticSound('toggle');

    try {
      const senderRole = isAdmin ? 'admin' : 'member';
      await voiceChatService.sendMessage({
        roomId: activeRoomId,
        senderId: participantIdRef.current,
        senderName: currentUserNick || (isAdmin ? 'Admin' : 'Membro'),
        senderRole,
        text: cleanText || undefined,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      });

      setInputText('');
      setPendingAttachments([]);
    } catch {
      onShowToast('Erro ao enviar mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg: ChatMessage) => {
    const isAuthor = msg.senderId === participantIdRef.current;
    if (!isAuthor && !isAdmin) {
      if (!onRequireAdmin('Apenas o Administrador ou o autor podem apagar esta mensagem.')) return;
    }

    playHapticSound('toggle');
    await voiceChatService.deleteMessage(msg.id, activeRoomId);
    onShowToast('Mensagem removida.');
  };

  // Clear all messages in room (Admin only)
  const handleClearRoom = async () => {
    if (!onRequireAdmin('Apenas o Administrador pode limpar o histórico do chat.')) return;
    if (!window.confirm(`Tem certeza que deseja apagar todas as mensagens da sala "${activeRoom.name}"?`))
      return;

    playHapticSound('toggle');
    await voiceChatService.clearRoomMessages(
      activeRoomId,
      messages.map((m) => m.id)
    );
    onShowToast(`Histórico da sala "${activeRoom.name}" limpo!`);
  };

  // Quick Emoji insert
  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    playHapticSound('click');
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter messages by search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.attachments?.some((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : messages;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
      }}
      onDrop={handleDrop}
      className="relative flex flex-col h-[calc(100vh-5.5rem)] max-w-7xl mx-auto rounded-3xl overflow-hidden bg-white dark:bg-[#0f1422] border border-[#e2e8f0] dark:border-[#222b3e] shadow-xl"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#2a14b4]/90 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <Paperclip className="w-16 h-16 animate-bounce mb-3 text-amber-300" />
          <h3 className="text-2xl font-bold font-display">Solte seus arquivos aqui!</h3>
          <p className="text-sm text-indigo-100 mt-1">
            Imagens, vídeos, áudios e documentos serão adicionados ao chat.
          </p>
        </div>
      )}

      {/* Top Header & Voice Room Switcher */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#171347] via-[#241775] to-[#3b2fc4] text-white flex flex-wrap items-center justify-between gap-3 border-b border-[#2b247c] shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 text-amber-300 shadow-inner">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                <span>VoiceChat</span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500 text-emerald-950 px-2 py-0.5 rounded-full shadow-xs">
                  MULTI-APARELHO
                </span>
              </h2>
            </div>
            <p className="text-xs text-indigo-100/80">
              Conexão estável simultânea entre computadores e celulares
            </p>
          </div>
        </div>

        {/* Room Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {PRESET_VOICE_ROOMS.map((room) => {
            const isActive = activeRoomId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => {
                  if (activeRoomId !== room.id) {
                    if (isInVoiceCall) {
                      handleLeaveVoice();
                    }
                    setActiveRoomId(room.id);
                    playHapticSound('click');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white text-[#241775] shadow-md scale-102 font-extrabold'
                    : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/10'
                }`}
              >
                <span>{room.icon}</span>
                <span>{room.name}</span>
              </button>
            );
          })}
        </div>

        {/* Actions (Search, Clear room) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showSearch
                ? 'bg-white text-[#241775] border-white'
                : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
            }`}
            title="Buscar no chat"
          >
            <Search className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={handleClearRoom}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Limpar histórico da sala (Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar (conditionally expanded) */}
      {showSearch && (
        <div className="px-5 py-2.5 bg-[#f8fafc] dark:bg-[#151b2e] border-b border-[#e2e8f0] dark:border-[#222b3e] flex items-center gap-2 animate-in slide-in-from-top duration-150">
          <Search className="w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar mensagens, arquivos ou membros nesta sala..."
            className="flex-1 bg-transparent text-xs font-medium text-[#131b2e] dark:text-[#f1f5f9] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-[#94a3b8] hover:text-[#475569] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Voice Communication Bar */}
      <div className="px-5 py-3.5 bg-[#f1f5f9] dark:bg-[#141a29] border-b border-[#e2e8f0] dark:border-[#222b3e] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeRoom.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#131b2e] dark:text-[#f1f5f9]">
                  Canal de Voz: {activeRoom.name}
                </span>
                {isInVoiceCall ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    CONECTADO
                  </span>
                ) : (
                  <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] bg-[#e2e8f0] dark:bg-[#1e2638] px-2 py-0.5 rounded-full font-medium">
                    Desconectado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate max-w-sm">
                {activeRoom.description}
              </p>
            </div>
          </div>
        </div>

        {/* Live Audio Visualizer & Call Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isInVoiceCall ? (
            <button
              onClick={handleJoinVoice}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/20 flex items-center gap-2 cursor-pointer transition-all duration-150 active:scale-98"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Entrar na Sala de Voz</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a2235] px-3 py-1.5 rounded-2xl border border-[#cbd5e1] dark:border-[#2b354d] shadow-xs">
              {/* Live Waveform Indicator */}
              <div
                className="flex items-center gap-0.5 px-2 h-6"
                title={`Nível do microfone: ${micVolumeLevel}%`}
              >
                {[1, 2, 3, 4, 5].map((bar) => {
                  const isActive = isSpeaking && micVolumeLevel > bar * 12;
                  return (
                    <div
                      key={bar}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isActive
                          ? 'bg-emerald-500 h-5 shadow-xs shadow-emerald-400'
                          : isMuted
                          ? 'bg-rose-300 dark:bg-rose-900 h-1.5'
                          : 'bg-slate-300 dark:bg-slate-700 h-2'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Mute Button */}
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-300/40'
                    : 'bg-[#f1f5f9] dark:bg-[#252f47] text-[#334155] dark:text-[#f1f5f9] hover:bg-[#e2e8f0]'
                }`}
                title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 text-rose-600" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-600" />
                )}
                <span className="hidden sm:inline">{isMuted ? 'Mutado' : 'Microfone'}</span>
              </button>

              {/* Deafen Button */}
              <button
                onClick={handleToggleDeafen}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDeafened
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-300/40'
                    : 'bg-[#f1f5f9] dark:bg-[#252f47] text-[#334155] dark:text-[#f1f5f9] hover:bg-[#e2e8f0]'
                }`}
                title={isDeafened ? 'Reativar Áudio' : 'Ensurdecer (Deafen)'}
              >
                {isDeafened ? (
                  <VolumeX className="w-4 h-4 text-rose-600" />
                ) : (
                  <Headphones className="w-4 h-4 text-indigo-600" />
                )}
                <span className="hidden sm:inline">{isDeafened ? 'Surdo' : 'Áudio'}</span>
              </button>

              {/* Input Mode Toggle (VAD vs PTT) */}
              <button
                onClick={() => {
                  setInputMode((prev) => (prev === 'vad' ? 'ptt' : 'vad'));
                  playHapticSound('click');
                }}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#f1f5f9] dark:bg-[#252f47] text-[#475569] dark:text-[#cbd5e1] hover:bg-[#e2e8f0] transition-colors cursor-pointer"
                title={inputMode === 'vad' ? 'Detecção Automática (VAD)' : 'Push-to-Talk (Segure Espaço)'}
              >
                {inputMode === 'vad' ? '🎙️ Auto' : '⌨️ PTT'}
              </button>

              {/* Disconnect Voice Button */}
              <button
                onClick={handleLeaveVoice}
                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Sair da Chamada de Voz"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Split between Voice Members Panel & Chat Stream */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Sidebar Panel: Connected Voice Members in Room */}
        <div className="w-60 sm:w-72 bg-[#f8fafc] dark:bg-[#111726] border-r border-[#e2e8f0] dark:border-[#222b3e] p-3 flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569] dark:text-[#94a3b8]">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Aparelhos Conectados ({participants.length})</span>
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="py-6 text-center px-2">
              <p className="text-xs text-[#94a3b8] dark:text-[#64748b] leading-relaxed">
                Nenhum aparelho na sala de voz no momento.
              </p>
              {!isInVoiceCall && (
                <button
                  onClick={handleJoinVoice}
                  className="mt-2.5 px-3 py-1.5 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Entrar com este aparelho</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((part) => {
                const isMe = part.id === participantIdRef.current;
                const speaking = part.isSpeaking;
                const volume = userVolumes[part.id] ?? 100;

                return (
                  <div
                    key={part.id}
                    className={`p-2.5 rounded-2xl transition-all flex flex-col gap-1.5 border ${
                      speaking
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 shadow-xs shadow-emerald-400/20'
                        : 'bg-white dark:bg-[#1a2235] border-[#e2e8f0] dark:border-[#28334b]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        {/* Avatar with speaking pulsing ring */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs ${
                              part.role === 'admin'
                                ? 'bg-gradient-to-tr from-amber-500 to-indigo-600'
                                : 'bg-gradient-to-tr from-indigo-500 to-teal-500'
                            } ${speaking ? 'ring-2 ring-emerald-400 ring-offset-1 animate-pulse' : ''}`}
                          >
                            {part.name.slice(0, 2)}
                          </div>
                          {speaking && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#1a2235]" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1 truncate">
                            <span className="text-xs font-bold text-[#131b2e] dark:text-[#f1f5f9] truncate">
                              {part.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold px-1 rounded">
                                este aparelho
                              </span>
                            )}
                          </div>
                          {part.role === 'admin' && (
                            <div className="flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                              <Crown className="w-2.5 h-2.5" />
                              <span>Admin</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mute/Deafen icons for participant */}
                      <div className="flex items-center gap-1 shrink-0 text-[#94a3b8]">
                        {part.isMuted && (
                          <span title="Microfone mutado">
                            <MicOff className="w-3.5 h-3.5 text-rose-500" />
                          </span>
                        )}
                        {part.isDeafened && (
                          <span title="Áudio ensurdecido">
                            <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volume Slider for Remote Participants */}
                    {!isMe && isInVoiceCall && (
                      <div className="pt-1 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800/80">
                        <Volume2 className="w-3 h-3 text-[#94a3b8] shrink-0" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => handleUserVolumeChange(part.id, Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#2a14b4]"
                        />
                        <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] tabular-nums w-7 text-right">
                          {volume}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Multi-device audio tips */}
          <div className="mt-auto pt-3 border-t border-[#e2e8f0] dark:border-[#222b3e] text-[10px] text-[#94a3b8] dark:text-[#64748b] space-y-1">
            <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <span>●</span>
              <span>Sincronização P2P Isolada Ativa</span>
            </p>
            <p>Vários aparelhos podem falar ao mesmo tempo sem se desconectar.</p>
          </div>
        </div>

        {/* Right Area: Chat Messages & Input */}
        <div className="flex-1 flex flex-col bg-[#ffffff] dark:bg-[#0f1422] overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#94a3b8]">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-[#1e293b] dark:text-[#f1f5f9]">
                  Início do chat na sala {activeRoom.name}
                </h3>
                <p className="text-xs max-w-sm mt-1 text-[#64748b] dark:text-[#94a3b8]">
                  Escreva uma mensagem ou envie qualquer foto, vídeo de gameplay, áudio gravado ou
                  arquivo para o grupo.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMe = msg.senderId === participantIdRef.current;
                const isAdminSender = msg.senderRole === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`group flex items-start gap-2.5 transition-all ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* User Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs uppercase ${
                        isAdminSender
                          ? 'bg-gradient-to-tr from-amber-500 to-indigo-600'
                          : 'bg-gradient-to-tr from-indigo-500 to-teal-500'
                      }`}
                    >
                      {msg.senderName.slice(0, 2)}
                    </div>

                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] space-y-1 ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Author Header */}
                      <div
                        className={`flex items-center gap-1.5 text-[11px] ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="font-bold text-[#334155] dark:text-[#cbd5e1]">
                          {msg.senderName}
                        </span>
                        {isAdminSender && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full">
                            <Crown className="w-2.5 h-2.5" />
                            ADMIN
                          </span>
                        )}
                        <span className="text-[10px] text-[#94a3b8] dark:text-[#64748b]">
                          {formatRelativeTime(msg.createdAt)}
                        </span>

                        {/* Delete message button on hover */}
                        <button
                          onClick={() => handleDeleteMessage(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#94a3b8] hover:text-rose-600 transition-opacity cursor-pointer"
                          title="Apagar mensagem"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Text Bubble */}
                      {msg.text && (
                        <div
                          className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                            isMe
                              ? 'bg-[#2a14b4] text-white rounded-tr-none'
                              : 'bg-[#f1f5f9] dark:bg-[#1a2235] text-[#131b2e] dark:text-[#f1f5f9] border border-[#e2e8f0] dark:border-[#2a344a] rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}

                      {/* Attachments Section (Images, Videos, Audios, Files) */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2 mt-1">
                          {msg.attachments.map((att) => {
                            // IMAGE PREVIEW
                            if (att.type === 'image') {
                              return (
                                <div
                                  key={att.id}
                                  className="relative group/att rounded-2xl overflow-hidden border border-[#e2e8f0] dark:border-[#2a344a] bg-black/5 shadow-xs max-w-sm"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="w-full max-h-72 object-cover rounded-2xl cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() =>
                                      setPreviewImage({ url: att.url, name: att.name })
                                    }
                                  />
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/att:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs p-1 rounded-xl text-white">
                                    <button
                                      onClick={() =>
                                        setPreviewImage({ url: att.url, name: att.name })
                                      }
                                      className="p-1 hover:text-amber-300 transition-colors"
                                      title="Ampliar Imagem"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      className="p-1 hover:text-emerald-300 transition-colors"
                                      title="Baixar Imagem"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            }

                            // VIDEO PLAYER
                            if (att.type === 'video') {
                              return (
                                <div
                                  key={att.id}
                                  className="rounded-2xl overflow-hidden border border-[#e2e8f0] dark:border-[#2a344a] bg-black max-w-md shadow-md"
                                >
                                  <video
                                    src={att.url}
                                    controls
                                    className="w-full max-h-80 rounded-2xl"
                                  />
                                  <div className="px-3 py-1.5 bg-[#141a29] text-white flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Film className="w-3.5 h-3.5 text-purple-400" />
                                      <span className="truncate">{att.name}</span>
                                    </div>
                                    <span className="text-[#94a3b8]">
                                      {formatFileSize(att.size)}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // AUDIO PLAYER
                            if (att.type === 'audio') {
                              return (
                                <div
                                  key={att.id}
                                  className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-[#1b2238] dark:to-[#171c2e] border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col gap-2 max-w-sm shadow-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 truncate">
                                      <div className="w-8 h-8 rounded-xl bg-[#2a14b4] text-white flex items-center justify-center shadow-xs">
                                        <Music className="w-4 h-4" />
                                      </div>
                                      <div className="truncate">
                                        <div className="text-xs font-bold text-[#131b2e] dark:text-[#f1f5f9] truncate">
                                          {att.name}
                                        </div>
                                        <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                                          {formatFileSize(att.size)}
                                        </div>
                                      </div>
                                    </div>
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      className="p-1.5 rounded-lg bg-white dark:bg-[#252f47] text-[#475569] dark:text-[#f1f5f9] hover:text-[#2a14b4] transition-colors shadow-2xs"
                                      title="Baixar Áudio"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                  <audio src={att.url} controls className="w-full h-8" />
                                </div>
                              );
                            }

                            // GENERAL FILE / DOCUMENT
                            return (
                              <div
                                key={att.id}
                                className="p-3 rounded-2xl bg-white dark:bg-[#1a2235] border border-[#e2e8f0] dark:border-[#28334b] flex items-center justify-between gap-3 max-w-sm shadow-xs"
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-[#131b2e] dark:text-[#f1f5f9] truncate">
                                      {att.name}
                                    </div>
                                    <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                                      {formatFileSize(att.size)}
                                    </div>
                                  </div>
                                </div>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="p-2 rounded-xl bg-[#2a14b4] hover:bg-[#200e94] text-white transition-colors shadow-xs shrink-0 cursor-pointer"
                                  title="Baixar Arquivo"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachments Strip (before sending) */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 py-2 bg-[#f8fafc] dark:bg-[#151b2e] border-t border-[#e2e8f0] dark:border-[#222b3e] flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] shrink-0">
                Anexos ({pendingAttachments.length}):
              </span>
              {pendingAttachments.map((att, idx) => (
                <div
                  key={att.id}
                  className="relative group bg-white dark:bg-[#1f293d] border border-[#cbd5e1] dark:border-[#334155] rounded-xl px-2.5 py-1.5 flex items-center gap-2 shrink-0 shadow-2xs"
                >
                  {att.type === 'image' && (
                    <img src={att.url} alt="" className="w-6 h-6 object-cover rounded-md" />
                  )}
                  {att.type === 'video' && <Film className="w-4 h-4 text-purple-500" />}
                  {att.type === 'audio' && <Music className="w-4 h-4 text-indigo-500" />}
                  {att.type === 'file' && <FileText className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] max-w-[120px] truncate">
                    {att.name}
                  </span>
                  <button
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-0.5 rounded-full hover:bg-rose-100 text-rose-500 cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Voice Note Recording Bar (Active) */}
          {isRecordingAudio && (
            <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-rose-800 dark:text-rose-200 animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                <span className="text-xs font-bold">Gravando Mensagem de Voz...</span>
                <span className="text-xs font-mono font-extrabold bg-rose-200 dark:bg-rose-900 px-2 py-0.5 rounded-md">
                  {Math.floor(recordingSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecordingAudio}
                  className="px-3 py-1 bg-white dark:bg-[#1a2235] hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAudio}
                  className="px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Concluir & Anexar
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white dark:bg-[#0f1422] border-t border-[#e2e8f0] dark:border-[#222b3e] flex items-end gap-2"
          >
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleFileInputChange}
              accept="image/*,video/*"
              multiple
              className="hidden"
            />

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl bg-[#f1f5f9] dark:bg-[#1a2235] hover:bg-[#e2e8f0] dark:hover:bg-[#252f47] text-[#475569] dark:text-[#94a3b8] hover:text-[#2a14b4] transition-colors cursor-pointer shadow-2xs"
              title="Anexar qualquer arquivo (Imagem, vídeo, som, zip, pdf...)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Quick Image/Video Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2.5 rounded-2xl bg-[#f1f5f9] dark:bg-[#1a2235] hover:bg-[#e2e8f0] dark:hover:bg-[#252f47] text-[#475569] dark:text-[#94a3b8] hover:text-[#2a14b4] transition-colors cursor-pointer shadow-2xs"
              title="Anexar Imagem ou Vídeo"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Record Audio Note Button */}
            <button
              type="button"
              onClick={isRecordingAudio ? stopRecordingAudio : startRecordingAudio}
              className={`p-2.5 rounded-2xl transition-colors cursor-pointer shadow-2xs ${
                isRecordingAudio
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-[#f1f5f9] dark:bg-[#1a2235] hover:bg-[#e2e8f0] dark:hover:bg-[#252f47] text-[#475569] dark:text-[#94a3b8] hover:text-[#2a14b4]'
              }`}
              title="Gravar mensagem de voz"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Textarea Input */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Mensagem em #${activeRoom.name}... (Enter para enviar)`}
                rows={1}
                className="w-full pl-3.5 pr-20 py-2.5 bg-[#f8fafc] dark:bg-[#151b2e] border border-[#e2e8f0] dark:border-[#263147] focus:border-[#2a14b4] focus:bg-white dark:focus:bg-[#1a2235] rounded-2xl text-xs sm:text-sm text-[#131b2e] dark:text-[#f1f5f9] resize-none transition-all focus:outline-none max-h-28"
              />

              {/* Quick Emojis inside input */}
              <div className="absolute right-2.5 bottom-2 flex items-center gap-1">
                {['🔥', '⚔️', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="hover:scale-120 transition-transform cursor-pointer text-xs"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && pendingAttachments.length === 0)}
              className="p-2.5 bg-[#2a14b4] hover:bg-[#200e94] disabled:opacity-40 text-white rounded-2xl shadow-md shadow-indigo-950/20 transition-all duration-150 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              title="Enviar Mensagem"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Lightbox Modal for Full Image Zoom Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
            <span className="text-sm font-bold truncate">{previewImage.name}</span>
            <div className="flex items-center gap-2">
              <a
                href={previewImage.url}
                download={previewImage.name}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar</span>
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <img
            src={previewImage.url}
            alt={previewImage.name}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
          />
        </div>
      )}
    </div>
  );
};

import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { AGORA_APP_BUILDER_CONFIG } from '../config/agoraConfig';

// Set Agora log level to warn/error only
AgoraRTC.setLogLevel(3);

export interface VoiceUser {
  uid: string | number;
  name: string;
  isSpeaking: boolean;
  volume: number;
  isMuted: boolean;
  isLocal: boolean;
  hasAudio?: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface JoinResult {
  success: boolean;
  isListenOnly?: boolean;
  error?: string;
  errorType?: 'MIC_DENIED' | 'NO_MIC_HARDWARE' | 'TOKEN_REQUIRED' | 'NETWORK_ERROR' | 'UNKNOWN';
}

type VoiceEventCallback = () => void;

class AgoraVoiceService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private currentChannel: string | null = null;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private hasMicrophone: boolean = false;
  private connectionStatus: ConnectionStatus = 'disconnected';

  private remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  private userVolumes: Map<string | number, number> = new Map();
  private userNames: Map<string | number, string> = new Map();

  private listeners: Set<VoiceEventCallback> = new Set();

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('Listener error in AgoraVoiceService:', err);
      }
    });
  }

  public subscribe(callback: VoiceEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getChannel(): string | null {
    return this.currentChannel;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  public getHasMicrophone(): boolean {
    return this.hasMicrophone;
  }

  public getParticipants(localUserName: string): VoiceUser[] {
    const list: VoiceUser[] = [];

    // Local user
    if (this.connectionStatus === 'connected' && this.client?.uid) {
      const vol = this.userVolumes.get(this.client.uid) || 0;
      list.push({
        uid: this.client.uid,
        name: localUserName || 'Você',
        isSpeaking: this.hasMicrophone && !this.isMuted && vol > 5,
        volume: vol,
        isMuted: this.isMuted || !this.hasMicrophone,
        isLocal: true,
        hasAudio: this.hasMicrophone,
      });
    }

    // Remote users
    this.remoteUsers.forEach((user, uid) => {
      const vol = this.userVolumes.get(uid) || 0;
      const customName = this.userNames.get(uid) || `Membro ${String(uid).slice(0, 4)}`;
      const hasAudio = user.hasAudio;

      list.push({
        uid,
        name: customName,
        isSpeaking: hasAudio && vol > 5,
        volume: vol,
        isMuted: !hasAudio,
        isLocal: false,
        hasAudio,
      });
    });

    return list;
  }

  public async join(channelName: string, userName: string, customToken?: string): Promise<JoinResult> {
    try {
      if (this.connectionStatus === 'connected') {
        if (this.currentChannel === channelName) {
          return { success: true, isListenOnly: !this.hasMicrophone };
        }
        await this.leave();
      }

      this.connectionStatus = 'connecting';
      this.currentChannel = channelName;
      this.notify();

      if (!this.client) {
        this.client = AgoraRTC.createClient({
          mode: 'rtc',
          codec: AGORA_APP_BUILDER_CONFIG.SDK_CODEC as 'vp8',
        });
      }

      // Remote track event handlers
      this.client.on('user-published', async (user, mediaType) => {
        this.remoteUsers.set(user.uid, user);
        await this.client!.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          if (!this.isDeafened) {
            user.audioTrack?.play();
          }
        }
        this.notify();
      });

      this.client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          user.audioTrack?.stop();
        }
        this.notify();
      });

      this.client.on('user-left', (user) => {
        this.remoteUsers.delete(user.uid);
        this.userVolumes.delete(user.uid);
        this.notify();
      });

      this.client.on('connection-state-change', (curState) => {
        if (curState === 'CONNECTED') this.connectionStatus = 'connected';
        else if (curState === 'DISCONNECTED') this.connectionStatus = 'disconnected';
        else if (curState === 'CONNECTING') this.connectionStatus = 'connecting';
        else if (curState === 'RECONNECTING') this.connectionStatus = 'reconnecting';
        this.notify();
      });

      // Volume indicator
      this.client.enableAudioVolumeIndicator();
      this.client.on('volume-indicator', (volumes) => {
        volumes.forEach((vol) => {
          this.userVolumes.set(vol.uid, Math.round(vol.level));
        });
        this.notify();
      });

      // STEP 1: Join Agora RTC Channel
      const sanitizedChannel = channelName.trim().replace(/\s+/g, '-').toLowerCase();
      try {
        await this.client.join(
          AGORA_APP_BUILDER_CONFIG.APP_ID,
          sanitizedChannel,
          customToken ? customToken.trim() : null,
          null
        );
      } catch (agoraErr: any) {
        console.warn('Agora client.join error:', agoraErr);
        const code = agoraErr?.code || agoraErr?.name || '';
        const msg = String(agoraErr?.message || agoraErr || '');
        const isTokenRequired =
          code === 'CAN_NOT_JOIN_WITH_NO_TOKEN' ||
          code === 'CAN_NOT_GET_GATEWAY_SERVER' ||
          code === 110 ||
          code === 109 ||
          code === 4096 ||
          code === 'DYNAMIC_KEY_TIMEOUT' ||
          msg.includes('dynamic use static key') ||
          msg.includes('CAN_NOT_GET_GATEWAY_SERVER') ||
          msg.toLowerCase().includes('token') ||
          msg.toLowerCase().includes('dynamic key');

        this.connectionStatus = 'disconnected';
        this.currentChannel = null;
        this.notify();

        return {
          success: false,
          errorType: isTokenRequired ? 'TOKEN_REQUIRED' : 'NETWORK_ERROR',
          error: isTokenRequired
            ? 'O projeto Agora requer chave dinâmica (Token). O aplicativo oficial tadalavoz.vercel.app gerencia os tokens automaticamente.'
            : `Falha ao ingressar no canal: ${msg}`,
        };
      }

      // STEP 2: Acquire microphone track with graceful fallback to Listen-Only
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_standard',
          AEC: true,
          ANS: AGORA_APP_BUILDER_CONFIG.ENABLE_NOISE_CANCELLATION,
          AGC: true,
        });

        await this.client.publish([this.localAudioTrack]);
        this.hasMicrophone = true;
        this.isMuted = false;
        this.connectionStatus = 'connected';
        this.notify();
        return { success: true, isListenOnly: false };
      } catch (micErr: any) {
        console.warn('Microphone unavailable or blocked. Joining in Listen-Only mode:', micErr);
        this.localAudioTrack = null;
        this.hasMicrophone = false;
        this.isMuted = true;
        this.connectionStatus = 'connected';
        this.notify();

        const isDenied = micErr?.name === 'NotAllowedError' || micErr?.code === 'PERMISSION_DENIED';
        return {
          success: true,
          isListenOnly: true,
          errorType: isDenied ? 'MIC_DENIED' : 'NO_MIC_HARDWARE',
          error: isDenied
            ? 'Permissão de microfone bloqueada pelo navegador. Conectado em Modo Ouvinte.'
            : 'Nenhum microfone detectado. Conectado em Modo Ouvinte.',
        };
      }
    } catch (generalErr: any) {
      console.error('General error joining Agora voice room:', generalErr);
      this.connectionStatus = 'disconnected';
      this.currentChannel = null;
      this.notify();
      return {
        success: false,
        errorType: 'UNKNOWN',
        error: String(generalErr?.message || generalErr || 'Erro desconhecido ao conectar.'),
      };
    }
  }

  public async requestMicrophoneAccess(): Promise<boolean> {
    if (this.connectionStatus !== 'connected' || !this.client) return false;

    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      }

      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true,
        ANS: true,
        AGC: true,
      });

      await this.client.publish([this.localAudioTrack]);
      this.hasMicrophone = true;
      this.isMuted = false;
      this.notify();
      return true;
    } catch (err) {
      console.warn('Failed to acquire microphone on retry:', err);
      return false;
    }
  }

  public async leave(): Promise<void> {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      this.remoteUsers.forEach((u) => {
        u.audioTrack?.stop();
      });
      this.remoteUsers.clear();
      this.userVolumes.clear();

      if (this.client) {
        await this.client.leave();
      }

      this.connectionStatus = 'disconnected';
      this.currentChannel = null;
      this.isMuted = false;
      this.isDeafened = false;
      this.hasMicrophone = false;
      this.notify();
    } catch (err) {
      console.warn('Error leaving Agora voice channel:', err);
      this.connectionStatus = 'disconnected';
      this.currentChannel = null;
      this.notify();
    }
  }

  public toggleMute(): boolean {
    if (!this.hasMicrophone || !this.localAudioTrack) {
      return true;
    }
    this.isMuted = !this.isMuted;
    this.localAudioTrack.setEnabled(!this.isMuted);
    this.notify();
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    this.remoteUsers.forEach((u) => {
      if (this.isDeafened) {
        u.audioTrack?.stop();
      } else {
        u.audioTrack?.play();
      }
    });

    if (this.isDeafened && !this.isMuted && this.localAudioTrack) {
      this.isMuted = true;
      this.localAudioTrack.setEnabled(false);
    }
    this.notify();
    return this.isDeafened;
  }

  public setPushToTalk(active: boolean) {
    if (!this.hasMicrophone || !this.localAudioTrack) return;
    this.localAudioTrack.setEnabled(active);
    this.isMuted = !active;
    this.notify();
  }
}

export const agoraVoiceService = new AgoraVoiceService();

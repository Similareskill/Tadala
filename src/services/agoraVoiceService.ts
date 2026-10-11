import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { AGORA_APP_BUILDER_CONFIG } from '../config/agoraConfig';

// Disable Agora verbose logs in development
AgoraRTC.setLogLevel(3);

export interface VoiceUser {
  uid: string | number;
  name: string;
  isSpeaking: boolean;
  volume: number;
  isMuted: boolean;
  isLocal: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type VoiceEventCallback = () => void;

class AgoraVoiceService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private currentChannel: string | null = null;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private connectionStatus: ConnectionStatus = 'disconnected';

  private remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  private userVolumes: Map<string | number, number> = new Map();
  private userNames: Map<string | number, string> = new Map();

  private listeners: Set<VoiceEventCallback> = new Set();

  constructor() {
    // Client initialized on demand
  }

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

  public getParticipants(localUserName: string): VoiceUser[] {
    const list: VoiceUser[] = [];

    // Local user
    if (this.connectionStatus === 'connected' && this.client?.uid) {
      const vol = this.userVolumes.get(this.client.uid) || 0;
      list.push({
        uid: this.client.uid,
        name: localUserName || 'Você',
        isSpeaking: !this.isMuted && vol > 5,
        volume: vol,
        isMuted: this.isMuted,
        isLocal: true,
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
      });
    });

    return list;
  }

  public async join(channelName: string, userName: string): Promise<boolean> {
    try {
      if (this.connectionStatus === 'connected') {
        if (this.currentChannel === channelName) return true;
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

      // Event Handlers
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

      // Enable volume indicator
      this.client.enableAudioVolumeIndicator();
      this.client.on('volume-indicator', (volumes) => {
        volumes.forEach((vol) => {
          this.userVolumes.set(vol.uid, Math.round(vol.level));
        });
        this.notify();
      });

      // Join Agora Channel using App ID without token (app certificate not enforced)
      const sanitizedChannel = channelName.trim().replace(/\s+/g, '-').toLowerCase();
      await this.client.join(
        AGORA_APP_BUILDER_CONFIG.APP_ID,
        sanitizedChannel,
        null,
        null
      );

      // Create Microphone audio track with noise cancellation
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'high_quality_stereo',
        AEC: true,
        ANS: AGORA_APP_BUILDER_CONFIG.ENABLE_NOISE_CANCELLATION,
        AGC: true,
      });

      // Publish local audio track
      await this.client.publish([this.localAudioTrack]);
      this.isMuted = false;
      this.connectionStatus = 'connected';
      this.notify();
      return true;
    } catch (err) {
      console.error('Error joining Agora voice channel:', err);
      this.connectionStatus = 'disconnected';
      this.currentChannel = null;
      this.notify();
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
      this.notify();
    } catch (err) {
      console.warn('Error leaving Agora voice channel:', err);
      this.connectionStatus = 'disconnected';
      this.currentChannel = null;
      this.notify();
    }
  }

  public toggleMute(): boolean {
    if (!this.localAudioTrack) return false;
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

    // When deafened, also mute microphone
    if (this.isDeafened && !this.isMuted && this.localAudioTrack) {
      this.isMuted = true;
      this.localAudioTrack.setEnabled(false);
    }
    this.notify();
    return this.isDeafened;
  }

  public setPushToTalk(active: boolean) {
    if (!this.localAudioTrack) return;
    this.localAudioTrack.setEnabled(active);
    this.isMuted = !active;
    this.notify();
  }
}

export const agoraVoiceService = new AgoraVoiceService();

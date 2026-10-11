export const AGORA_APP_BUILDER_CONFIG = {
  APP_ID: '06befc5d8c5547eab2792fb99033de29',
  ENCRYPTION_ENABLED: true,
  ENABLE_GOOGLE_OAUTH: false,
  ENABLE_APPLE_OAUTH: false,
  ENABLE_SLACK_OAUTH: false,
  ENABLE_MICROSOFT_OAUTH: false,
  PROJECT_ID: 'd9529dbbef6ef12ca8e2',
  RECORDING_MODE: 'MIX',
  RECORDING_REGION: 0,
  GEO_FENCING: true,
  LOG_ENABLED: true,
  EVENT_MODE: false,
  RAISE_HAND: false,
  AUDIO_ROOM: true,
  PRODUCT_ID: 'tadalachatvoz',
  APP_NAME: 'TadalaChatVoz',
  LOGO: 'https://dl-prod.rteappbuilder.com/tluafed/5TWpUqsdC0BH6lPJ.jpeg',
  PRIMARY_COLOR: '#00AEFC',
  FRONTEND_ENDPOINT: 'https://voicetadala.vercel.app',
  BACKEND_ENDPOINT: 'https://managedservices-prod.rteappbuilder.com',
  CHAT_ORG_NAME: 'TADALA',
  CHAT_APP_NAME: 'TADALA',
  SDK_CODEC: 'vp8',
  ENABLE_NOISE_CANCELLATION: true,
  ENABLE_LIVE_REACTIONS: true,
  BACKGROUND_COLOR: '#111111',
  CARD_COLOR: '#181818',
  PRIMARY_ACTION_BRAND_COLOR: '#00AEFC',
};

export interface VoiceChannelPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  maxUsers?: number;
  icon: string;
}

export const PRESET_VOICE_CHANNELS: VoiceChannelPreset[] = [
  {
    id: 'tadala-geral',
    name: 'Geral TADALA',
    description: 'Bate-papo de voz livre da guilda TADALA',
    category: 'Comum',
    icon: '🎙️',
  },
  {
    id: 'tadala-boss',
    name: 'Call de Boss & Check-in',
    description: 'Comunicação tática para bosses mundiais e T.A.',
    category: 'Bosses',
    icon: '⚔️',
  },
  {
    id: 'tadala-gvg',
    name: 'GvG & Cruzada',
    description: 'Coordenação em tempo real para guerras de guilda',
    category: 'GvG',
    icon: '🏰',
  },
  {
    id: 'tadala-dungeon',
    name: 'Dungeon & Farm',
    description: 'Grupos fechados para Abadia, Anônimas e gelo',
    category: 'Dungeon',
    icon: '🛡️',
  },
];

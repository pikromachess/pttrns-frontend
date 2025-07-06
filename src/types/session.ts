// Интерфейс согласно официальной документации TON Connect
export interface SignDataRequest {
  signature: string;
  address: string;
  timestamp: number;
  domain: string;
  payload: {
    type: 'text';
    text: string;
  };
  // Убираем поля, которых нет в официальном API SignDataResponse
  // public_key и walletStateInit получаются на бэкенде другими способами
}

// Payload для подписи данных
export interface SignDataPayload {
  type: 'text' | 'binary' | 'cell';
  text?: string;
  bytes?: string;
  cell?: string;
  schema?: string;
}

export interface NftListenRequest {
  nftAddress: string;
  timestamp: number;
}

export interface SessionCreateResponse {
  sessionId: string;
  musicServerUrl: string;
  expiresAt: string;
}

export interface SessionValidateResponse {
  valid: boolean;
  address: string;
  expiresAt: string;
}

export interface SessionUserStats {
  userAddress: string;
  uniqueNftsListened: number;
  uniqueCollections: number;
  totalListens: number;
  lastActivity: string | null;
  sessionExpiresAt: string;
}

export interface SessionListenResponse {
  success: boolean;
  userListenCount: number;
  message: string;
}

// Кеш для сессий
export interface SessionCache {
  sessionId: string;
  expiresAt: Date;
  musicServerUrl: string;
}

// Обновляем NFT интерфейс для включения сессионных данных
export interface NFTWithSession {
  address: string;
  index?: number;
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
    attributes?: any[];
    animation_url?: string;
    audio_url?: string;
    [key: string]: any;
  };
  collection?: {
    name?: string;
    address?: string;
  };  
  trust?: string; 
  audioUrl?: string;
  sessionId?: string;
  musicServerUrl?: string;
}

// Типы для TonConnect
export interface TonConnectSignDataPayload {
  network: string;
  type: 'text';
  text: string;
}

// Обработчик ошибок сессии
export interface SessionError {
  code: string;
  message: string;
  details?: string;
}

// JWT Payload для сессии
export interface SessionJWTPayload {
  address: string;
  domain: string;
  timestamp: number;
  type: 'listening_session';
  exp: number;
  iat: number;
}

// Данные сессии в памяти
export interface SessionData {
  sessionId: string;
  userAddress: string;
  createdAt: Date;
  expiresAt: Date;
  signatureVerified: boolean;
}
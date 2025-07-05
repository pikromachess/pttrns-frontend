export interface SignDataRequest {
  signature: string;
  address: string;
  timestamp: number;
  domain: string;
  payload: {
    type: 'text';
    text: string;
  };
  public_key?: string;
  walletStateInit?: string;
}

export interface SignDataResult {
  signature: string;
  address: string;
  timestamp: number;
  domain: string;
  payload: {
    type: 'text';
    text: string;
  };
  public_key?: string;
  walletStateInit?: string;
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
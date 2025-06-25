import type { NFT } from './nft';

export interface MusicApiKeyData {
  apiKey: string;
  expiresAt: string;
  musicServerUrl: string;
}

export interface MusicGenerationRequest {
  metadata: NFT['metadata'];
  index: NFT['index'];
}

export interface MusicGenerationOptions {
  authToken: string;
  retryOnAuthError?: boolean;
  timeout?: number;
}

export interface ListenRecord {
  nftAddress: string;
  collectionAddress: string;
  timestamp: number;
}

export interface ListenTracker {
  canRecord: (nft: NFT) => boolean;
  markAsRecorded: (nft: NFT) => void;
  shouldRecord: (nft: NFT, currentTime: number, duration: number) => boolean;
  clear: () => void;
}
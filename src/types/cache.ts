import type { NFT } from './nft';

export interface CacheEntry {
  url: string;
  timestamp: number;
  nftKey: string;
}

export interface CacheOptions {
  maxSize?: number;
  maxAge?: number; // в миллисекундах
}

export interface MusicCache {
  get: (nft: NFT) => string | null;
  set: (nft: NFT, url: string) => void;
  has: (nft: NFT) => boolean;
  delete: (nft: NFT) => boolean;
  clear: () => void;
  size: () => number;
  cleanup: () => void;
}

export interface ApiKeyCache {
  key: string;
  expiresAt: Date;
  serverUrl: string;
}
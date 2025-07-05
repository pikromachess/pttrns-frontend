import type { ReactNode } from 'react';

export interface NFT {
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

export interface NFTListProps {
  nfts: NFT[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: string | null;
}

export interface NFTContextType {
  nfts: NFT[];
  loading: boolean;
  error: string | null;
  network: string | null;
  lastWalletAddress: string | null;
  loadNftsForWallet: (walletAddress: string, chain: string) => Promise<void>;
  refreshNfts: (walletAddress: string, selectedNetwork: string) => void;
}

export interface NFTProviderProps {
  children: ReactNode;
}

export interface NFTResponse {
    data?: {
        nft_items?: NFT[];
    };
    total?: number;
    hasMore?: boolean;
}

export interface Collection {
  address: string;
  name: string;
  image?: string;
  totalListens: number;
  description?: string;
}

export interface NFTWithListens {
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
  listens: number;
}

export interface NFTStatsResponse {
  nfts: NFTWithListens[];
  total: number;
  hasMore: boolean;
}
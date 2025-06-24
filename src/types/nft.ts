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
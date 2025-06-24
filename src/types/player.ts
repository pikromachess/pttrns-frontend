import type { ReactNode } from 'react';
import type { NFT } from './nft';

export interface PlayerContextType {
  currentNft: NFT | null;
  isPlaying: boolean;
  isPlayerVisible: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  playlist: NFT[];
  updatePlaylist: (nfts: NFT[]) => void;
  playNft: (nft: NFT, nfts?: NFT[]) => Promise<void>;
  togglePlay: () => void;
  seekTo: (percentage: number) => void;
  closePlayer: () => void;
  playNextTrack: () => Promise<void>;
  playPreviousTrack: () => Promise<void>;
  changeVolume: (volume: number) => void;
  toggleMute: () => void;
}

export interface PlayerProviderProps {
  children: ReactNode;
}

export interface AudioState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface MusicApiKeyData {
  apiKey: string;
  expiresAt: string;
  musicServerUrl: string;
}
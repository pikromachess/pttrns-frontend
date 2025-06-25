export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  progress: number;
}

export interface AudioControls {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  loadTrack: (url: string) => Promise<void>;
}

export interface AudioEvents {
  onTimeUpdate: (time: number, duration: number) => void;
  onLoadStart: () => void;
  onCanPlay: () => void;
  onPlaying: () => void;
  onPause: () => void;
  onEnded: () => void;
  onError: (error: string) => void;
  onLoadedMetadata: (duration: number) => void;
}
import { useState, useRef, useEffect, useCallback } from 'react';
import type { AudioState, AudioControls } from '../types/audio';
import { safeSeek, safeSetVolume } from '../utils/audioUtils';

interface UseAudioPlayerOptions {
  initialVolume?: number;
  onTimeUpdate?: (time: number, duration: number) => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onPlaying?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onLoadedMetadata?: (duration: number) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const {
    initialVolume = 0.8,
    onTimeUpdate,
    onLoadStart,
    onCanPlay,
    onPlaying,
    onPause,
    onEnded,
    onError,
    onLoadedMetadata
  } = options;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 180, // значение по умолчанию
    volume: initialVolume,
    isMuted: false,
    progress: 0
  });

  const [previousVolume, setPreviousVolume] = useState(initialVolume);

  // Инициализация аудио элемента
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous';
    }

    const audio = audioRef.current;
    audio.volume = state.isMuted ? 0 : state.volume;

    return () => {
      if (audio && audio.src) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Обработчики событий аудио
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const duration = audio.duration || state.duration;
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

      setState(prev => ({
        ...prev,
        currentTime,
        duration,
        progress
      }));

      onTimeUpdate?.(currentTime, duration);
    };

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true }));
      onLoadStart?.();
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
      onCanPlay?.();
    };

    const handlePlaying = () => {
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
      onPlaying?.();
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      onPause?.();
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, progress: 0 }));
      onEnded?.();
    };

    const handleError = () => {
      const errorMessage = 'Ошибка воспроизведения аудио';
      setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
      onError?.(errorMessage);
    };

    const handleLoadedMetadata = () => {
      const duration = audio.duration || 180;
      setState(prev => ({ ...prev, duration }));
      onLoadedMetadata?.(duration);
    };

    // Добавляем обработчики
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onTimeUpdate, onLoadStart, onCanPlay, onPlaying, onPause, onEnded, onError, onLoadedMetadata, state.duration]);

  // Контролы
  const controls: AudioControls = {
    play: useCallback(async () => {
      if (!audioRef.current) return;
      
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Ошибка воспроизведения:', error);
        onError?.('Ошибка при запуске воспроизведения');
      }
    }, [onError]),

    pause: useCallback(() => {
      if (!audioRef.current) return;
      audioRef.current.pause();
    }, []),

    stop: useCallback(() => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }, []),

    seekTo: useCallback((time: number) => {
      if (!audioRef.current) return;
      
      if (safeSeek(audioRef.current, time)) {
        const duration = audioRef.current.duration || state.duration;
        const progress = duration > 0 ? (time / duration) * 100 : 0;
        
        setState(prev => ({
          ...prev,
          currentTime: time,
          progress
        }));
      }
    }, [state.duration]),

    setVolume: useCallback((volume: number) => {
      if (!audioRef.current) return;
      
      const clampedVolume = Math.max(0, Math.min(1, volume));
      
      if (safeSetVolume(audioRef.current, clampedVolume)) {
        setState(prev => ({
          ...prev,
          volume: clampedVolume,
          isMuted: clampedVolume === 0
        }));

        if (clampedVolume > 0 && state.isMuted) {
          setState(prev => ({ ...prev, isMuted: false }));
        }
      }
    }, [state.isMuted]),

    toggleMute: useCallback(() => {
      if (!audioRef.current) return;

      if (state.isMuted) {
        // Включаем звук
        safeSetVolume(audioRef.current, previousVolume);
        setState(prev => ({
          ...prev,
          isMuted: false,
          volume: previousVolume
        }));
      } else {
        // Выключаем звук
        setPreviousVolume(state.volume);
        safeSetVolume(audioRef.current, 0);
        setState(prev => ({
          ...prev,
          isMuted: true
        }));
      }
    }, [state.isMuted, state.volume, previousVolume]),

    loadTrack: useCallback(async (url: string) => {
      if (!audioRef.current) return;

      const audio = audioRef.current;
      
      try {
        // Останавливаем текущее воспроизведение
        audio.pause();
        audio.currentTime = 0;
        
        // Загружаем новый трек
        audio.src = url;
        audio.volume = state.isMuted ? 0 : state.volume;
        
        // Сбрасываем состояние
        setState(prev => ({
          ...prev,
          currentTime: 0,
          progress: 0,
          isLoading: true,
          isPlaying: false
        }));

        // Ждем загрузки метаданных
        await new Promise<void>((resolve, reject) => {
          const handleLoad = () => {
            audio.removeEventListener('loadedmetadata', handleLoad);
            audio.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = () => {
            audio.removeEventListener('loadedmetadata', handleLoad);
            audio.removeEventListener('error', handleError);
            reject(new Error('Ошибка загрузки трека'));
          };

          audio.addEventListener('loadedmetadata', handleLoad);
          audio.addEventListener('error', handleError);
        });

      } catch (error) {
        console.error('Ошибка загрузки трека:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        throw error;
      }
    }, [state.isMuted, state.volume])
  };

  return {
    state,
    controls,
    audioRef
  };
}
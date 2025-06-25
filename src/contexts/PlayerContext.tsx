// src/contexts/PlayerContext.refactored.tsx
import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  useRef  
} from 'react';

import type { PlayerContextType, PlayerProviderProps } from '../types/player';
import type { NFT } from '../types/nft';
import { BackendTokenContext } from '../BackendTokenContext';

// Импортируем наши новые хуки
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useMusicCache } from '../hooks/useMusicCache';
import { useListenTracker } from '../hooks/useListenTracker';
import { useMusicApiKey } from '../hooks/useMusicApiKey';
import { usePlaylistManager } from '../hooks/usePlaylistManager';
import { useProgressTimer } from '../hooks/useProgressTimer';

// Импортируем сервисы
import { musicGenerationService } from '../services/musicGenerationService';
import { listenRecordService } from '../services/listenRecordService';

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: PlayerProviderProps) {
  // Основное состояние плеера
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  
  // Контекст авторизации
  const { token } = useContext(BackendTokenContext);
  
  // Ref для отслеживания монтирования
  const isMountedRef = useRef(true);

  // Инициализируем хуки
  const musicCache = useMusicCache({ maxSize: 50, maxAge: 30 * 60 * 1000 });
  const listenTracker = useListenTracker();
  const musicApiKey = useMusicApiKey();

  // Хук управления плейлистом
  const playlistManager = usePlaylistManager({
    onTrackChange: (nft, index) => {
      console.log('🎵 Трек изменился:', { name: nft.metadata?.name, index });
    },
    onPlaylistUpdate: (playlist) => {
      console.log('📋 Плейлист обновлен:', playlist.length, 'треков');
    }
  });

  // Хук таймера прогресса
  const progressTimer = useProgressTimer({
    onTimeUpdate: (currentTime, duration, progress) => {
      // Обновления времени обрабатываются автоматически через audioPlayer
    },
    onTrackEnd: () => {
      console.log('🔄 Трек завершен, переключаемся на следующий');
      handleTrackEnd();
    },
    onListenThresholdReached: (currentTime, duration) => {
      const currentNft = playlistManager.getCurrentTrack();
      if (currentNft && listenTracker.shouldRecord(currentNft, currentTime, duration)) {
        recordListen(currentNft);
      }
    }
  });

  // Хук аудио плеера
  const audioPlayer = useAudioPlayer({
    onTimeUpdate: (time, duration) => {
      // Дополнительная логика при обновлении времени
      const currentNft = playlistManager.getCurrentTrack();
      if (currentNft && listenTracker.shouldRecord(currentNft, time, duration)) {
        recordListen(currentNft);
      }
    },
    onPlaying: () => {
      progressTimer.start(audioPlayer.audioRef.current);
    },
    onPause: () => {
      progressTimer.pause();
    },
    onEnded: () => {
      handleTrackEnd();
    },
    onError: (error) => {
      console.error('❌ Ошибка аудио плеера:', error);
      setIsLoadingTrack(false);
      // Попробуем переключиться на следующий трек при ошибке
      if (!playlistManager.isEmpty()) {
        setTimeout(() => handleTrackEnd(), 1000);
      }
    },
    onLoadedMetadata: (duration) => {
      progressTimer.setDuration(duration);
    }
  });

  // Функция записи прослушивания
  const recordListen = useCallback(async (nft: NFT) => {
    if (!listenTracker.canRecord(nft)) return;

    try {
      listenTracker.markAsRecorded(nft);
      const success = await listenRecordService.recordListen(nft);
      
      if (!success) {
        // Если запись не удалась, сбрасываем отметку
        listenTracker.resetNft?.(nft);
      }
    } catch (error) {
      console.error('❌ Ошибка записи прослушивания:', error);
      // Сбрасываем отметку при ошибке
      listenTracker.resetNft?.(nft);
    }
  }, [listenTracker]);

  // Обработка завершения трека
  const handleTrackEnd = useCallback(async () => {
    if (!isMountedRef.current) return;

    const nextTrack = playlistManager.getNextTrack();
    
    if (nextTrack) {
      await playNextTrack();
    } else {
      // Плейлист закончился
      closePlayer();
    }
  }, [playlistManager]);

  // Генерация музыки для NFT
  const generateMusicForNft = useCallback(async (nft: NFT): Promise<string> => {
    if (!token) {
      throw new Error('Необходима авторизация для генерации музыки');
    }

    // Проверяем кеш
    const cachedUrl = musicCache.get(nft);
    if (cachedUrl) {
      console.log('💾 Используем закешированную музыку для:', nft.metadata?.name);
      return cachedUrl;
    }

    // Генерируем новую музыку
    console.log('🎼 Генерируем музыку для:', nft.metadata?.name);
    
    const audioUrl = await musicGenerationService.generateMusicWithRetry(
      nft,
      () => musicApiKey.getValidKey(token),
      () => musicApiKey.refreshKey(token)
    );

    // Кешируем результат
    musicCache.set(nft, audioUrl);
    
    return audioUrl;
  }, [token, musicCache, musicApiKey]);

  // Предзагрузка следующего трека
  const preloadNextTrack = useCallback(async () => {
    const nextTrack = playlistManager.getNextTrack();
    if (!nextTrack || !token) return;

    // Проверяем, нет ли уже в кеше
    if (musicCache.has(nextTrack)) {
      console.log('💾 Следующий трек уже закеширован');
      return;
    }

    try {
      console.log('⏳ Предзагружаем следующий трек:', nextTrack.metadata?.name);
      await musicGenerationService.preloadMusic(
        nextTrack,
        () => musicApiKey.getValidKey(token),
        (url) => musicCache.set(nextTrack, url),
        (error) => console.error('❌ Ошибка предзагрузки:', error)
      );
    } catch (error) {
      console.error('❌ Ошибка предзагрузки следующего трека:', error);
    }
  }, [playlistManager, musicCache, musicApiKey, token]);

  // Основная функция воспроизведения
  const playNft = useCallback(async (nft: NFT, nfts: NFT[] = []) => {
    if (!token) {
      console.error('❌ Отсутствует токен авторизации');
      return;
    }

    console.log('🎯 Запуск воспроизведения NFT:', {
      name: nft.metadata?.name,
      address: nft.address,
      playlistSize: nfts.length
    });

    try {
      setIsLoadingTrack(true);
      setIsPlayerVisible(true);

      // Обновляем плейлист
      const finalPlaylist = nfts.length > 0 ? nfts : [nft];
      playlistManager.updatePlaylist(finalPlaylist, nft);

      // Генерируем музыку
      const audioUrl = await generateMusicForNft(nft);

      // Загружаем и воспроизводим трек
      await audioPlayer.controls.loadTrack(audioUrl);
      await audioPlayer.controls.play();

      setIsLoadingTrack(false);

      // Предзагружаем следующий трек
      if (finalPlaylist.length > 1) {
        preloadNextTrack();
      }

    } catch (error) {
      console.error('❌ Ошибка воспроизведения:', error);
      setIsLoadingTrack(false);
      // Не закрываем плеер, чтобы пользователь мог попробовать другой трек
    }
  }, [token, playlistManager, generateMusicForNft, audioPlayer, preloadNextTrack]);

  // Переключение на следующий трек
  const playNextTrack = useCallback(async () => {
    const nextNft = playlistManager.moveToNext();
    if (!nextNft) {
      console.log('🔴 Следующий трек не найден');
      closePlayer();
      return;
    }

    try {
      setIsLoadingTrack(true);
      progressTimer.stop();

      const audioUrl = await generateMusicForNft(nextNft);
      await audioPlayer.controls.loadTrack(audioUrl);
      await audioPlayer.controls.play();

      setIsLoadingTrack(false);

      // Предзагружаем следующий трек
      preloadNextTrack();

    } catch (error) {
      console.error('❌ Ошибка переключения на следующий трек:', error);
      setIsLoadingTrack(false);
      
      // Пробуем следующий трек
      const hasNext = !playlistManager.isEmpty() && playlistManager.getNextTrack();
      if (hasNext) {
        setTimeout(() => playNextTrack(), 1000);
      } else {
        closePlayer();
      }
    }
  }, [playlistManager, generateMusicForNft, audioPlayer, progressTimer, preloadNextTrack]);

  // Переключение на предыдущий трек
  const playPreviousTrack = useCallback(async () => {
    const prevNft = playlistManager.moveToPrevious();
    if (!prevNft) {
      console.log('🔴 Предыдущий трек не найден');
      return;
    }

    try {
      setIsLoadingTrack(true);
      progressTimer.stop();

      const audioUrl = await generateMusicForNft(prevNft);
      await audioPlayer.controls.loadTrack(audioUrl);
      await audioPlayer.controls.play();

      setIsLoadingTrack(false);

    } catch (error) {
      console.error('❌ Ошибка переключения на предыдущий трек:', error);
      setIsLoadingTrack(false);
    }
  }, [playlistManager, generateMusicForNft, audioPlayer, progressTimer]);

  // Управление воспроизведением
  const togglePlay = useCallback(() => {
    if (audioPlayer.state.isPlaying) {
      audioPlayer.controls.pause();
    } else {
      audioPlayer.controls.play();
    }
  }, [audioPlayer]);

  // Перемотка
  const seekTo = useCallback((percentage: number) => {
    const newTime = (percentage / 100) * audioPlayer.state.duration;
    audioPlayer.controls.seekTo(newTime);
    progressTimer.setTime(newTime);
  }, [audioPlayer, progressTimer]);

  // Управление громкостью
  const changeVolume = useCallback((volume: number) => {
    audioPlayer.controls.setVolume(volume);
  }, [audioPlayer]);

  const toggleMute = useCallback(() => {
    audioPlayer.controls.toggleMute();
  }, [audioPlayer]);

  // Закрытие плеера
  const closePlayer = useCallback(() => {
    audioPlayer.controls.stop();
    progressTimer.stop();
    setIsPlayerVisible(false);
    setIsLoadingTrack(false);
    playlistManager.clear();
    console.log('🔴 Плеер закрыт');
  }, [audioPlayer, progressTimer, playlistManager]);

  // Обновление плейлиста
  const updatePlaylist = useCallback((nfts: NFT[]) => {
    playlistManager.updatePlaylist(nfts);
  }, [playlistManager]);

  // Очистка при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      musicCache.clear();
      listenTracker.clear();
      musicApiKey.clearCache();
      musicGenerationService.cleanup();
      listenRecordService.cleanup();
    };
  }, [musicCache, listenTracker, musicApiKey]);

  // Значение контекста
  const value: PlayerContextType = {
    // Состояние
    currentNft: playlistManager.getCurrentTrack(),
    isPlaying: audioPlayer.state.isPlaying,
    isPlayerVisible,
    progress: audioPlayer.state.progress,
    duration: audioPlayer.state.duration,
    currentTime: audioPlayer.state.currentTime,
    volume: audioPlayer.state.volume,
    isMuted: audioPlayer.state.isMuted,
    playlist: playlistManager.playlist,
    isLoadingTrack,

    // Методы
    updatePlaylist,
    playNft,
    togglePlay,
    seekTo,
    closePlayer,
    playNextTrack,
    playPreviousTrack,
    changeVolume,
    toggleMute
  };

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioPlayer.audioRef} style={{ display: 'none' }} />
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};
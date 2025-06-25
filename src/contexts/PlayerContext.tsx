// src/contexts/PlayerContext.tsx
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
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(180);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [playlist, setPlaylist] = useState<NFT[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { token } = useContext(BackendTokenContext);
  
  // Ref для отслеживания монтирования
  const isMountedRef = useRef(true);

  // Инициализируем хуки
  const musicCache = useMusicCache({ maxSize: 50, maxAge: 30 * 60 * 1000 });
  const listenTracker = useListenTracker();
  const musicApiKey = useMusicApiKey();

  // Хук управления плейлистом
  const playlistManager = usePlaylistManager({
    onTrackChange: useCallback((nft: NFT, index: number) => {
      console.log('🎵 Трек изменился:', { name: nft.metadata?.name, index });
    }, []),
    onPlaylistUpdate: useCallback((playlist: NFT[]) => {
      console.log('📋 Плейлист обновлен:', playlist.length, 'треков');
    }, [])
  });

  // Хук таймера прогресса
  const progressTimer = useProgressTimer({
    onTimeUpdate: useCallback(() => {
      // Обновления времени обрабатываются автоматически через audioPlayer
    }, []),
    onTrackEnd: useCallback(() => {
      console.log('🔄 Трек завершен, переключаемся на следующий');
      handleTrackEnd();
    }, []), // Добавим handleTrackEnd в зависимости позже
    onListenThresholdReached: useCallback((currentTime: number, duration: number) => {
      const currentNft = playlistManager.getCurrentTrack();
      if (currentNft && listenTracker.shouldRecord(currentNft, currentTime, duration)) {
        recordListen(currentNft);
      }
    }, [playlistManager, listenTracker]) // Стабильные зависимости
  });

  // Хук аудио плеера
  const audioPlayer = useAudioPlayer({
    onTimeUpdate: useCallback((time: number, duration: number) => {
      // Дополнительная логика при обновлении времени
      const currentNft = playlistManager.getCurrentTrack();
      if (currentNft && listenTracker.shouldRecord(currentNft, time, duration)) {
        recordListen(currentNft);
      }
    }, [playlistManager, listenTracker]),
    onPlaying: useCallback(() => {
      progressTimer.start(audioPlayer.audioRef.current);
    }, [progressTimer]),
    onPause: useCallback(() => {
      progressTimer.pause();
    }, [progressTimer]),
    onEnded: useCallback(() => {
      handleTrackEnd();
    }, []), // Добавим handleTrackEnd в зависимости позже
    onError: useCallback((error: string) => {
      console.error('❌ Ошибка аудио плеера:', error);
      setIsLoadingTrack(false);
      // Попробуем переключиться на следующий трек при ошибке
      if (!playlistManager.isEmpty()) {
        setTimeout(() => handleTrackEnd(), 1000);
      }
    }, [playlistManager]),
    onLoadedMetadata: useCallback((duration: number) => {
      progressTimer.setDuration(duration);
    }, [progressTimer])
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

  // Основная функция воспроизведения с правильной логикой загрузки
  const playNft = async (nft: NFT, nfts: NFT[] = []) => {
    console.log('🎯 Запуск воспроизведения NFT:', {
      name: nft.metadata?.name,
      address: nft.address,
      playlistSize: nfts.length
    });
    
    // КРИТИЧЕСКИ ВАЖНО: Сбрасываем флаг записи прослушивания для НОВОГО трека
    listenRecordedRef.current = false;
    
    // ВАЖНО: Убеждаемся, что у NFT есть правильная информация о коллекции
    let enrichedNft = { ...nft };
    
    // Если коллекция отсутствует, но есть в плейлисте, берем оттуда
    if (!enrichedNft.collection?.address && nfts.length > 0) {
      const nftInPlaylist = nfts.find(n => n.address === nft.address);
      if (nftInPlaylist?.collection?.address) {
        enrichedNft.collection = nftInPlaylist.collection;
        console.log('🔧 Дополнили информацию о коллекции из плейлиста:', enrichedNft.collection.address);
      }
    }
    
    // Логируем финальные данные NFT для отладки
    console.log('🎵 Финальные данные NFT для воспроизведения:', {
      name: enrichedNft.metadata?.name,
      address: enrichedNft.address,
      collectionName: enrichedNft.collection?.name,
      collectionAddress: enrichedNft.collection?.address
    });
    
    // Формируем плейлист в правильном порядке
    const orderedPlaylist = nfts.length > 0 ? nfts : [enrichedNft];
    const selectedIndex = orderedPlaylist.findIndex(item => 
      item.address === enrichedNft.address || 
      (item.index === enrichedNft.index && !item.address && !enrichedNft.address)
    );
    
    const startIndex = selectedIndex !== -1 ? selectedIndex : 0;
    
    console.log('📋 Устанавливаем плейлист:', {
      total: orderedPlaylist.length,
      startIndex,
      currentTrack: enrichedNft.metadata?.name,
      collectionAddress: enrichedNft.collection?.address
    });
    
    setPlaylist(orderedPlaylist);
    setCurrentTrackIndex(startIndex);
    setCurrentNft(enrichedNft); // ВАЖНО: Используем обогащенный NFT
    setIsPlayerVisible(true);
    
    // Устанавливаем состояние загрузки
    setIsLoadingTrack(true);
    setIsPlaying(false); // ВАЖНО: ставим на паузу пока не загрузился трек
    
    setProgress(0);
    setCurrentTime(0);
    setDuration(180);

    // Получаем аудио URL для текущего трека
    const cacheKey = getNftCacheKey(enrichedNft);
    let audioUrl = enrichedNft.audioUrl;
    
    // Если аудио нет в NFT, проверяем кеш или генерируем
    if (!audioUrl) {
      if (musicCache.has(cacheKey)) {
        audioUrl = musicCache.get(cacheKey)!;
        console.log('💾 Используем закешированный аудио для:', enrichedNft.metadata?.name);
      } else {
        try {
          console.log('🎼 Генерируем музыку для текущего трека:', enrichedNft.metadata?.name);
          audioUrl = await generateMusicWithToken(enrichedNft, token!);
          musicCache.set(cacheKey, audioUrl);
        } catch (error) {
          console.error('❌ Ошибка генерации музыки:', error);
          setIsLoadingTrack(false);
          setIsPlaying(false);
          return;
        }
      }
    }

    // Воспроизводим текущий трек
    if (audioRef.current && audioUrl) {
      try {
        await audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        
        // Обновляем длительность при загрузке метаданных
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            const newDuration = audioRef.current.duration || 180;
            setDuration(newDuration);
            console.log('📊 Длительность трека обновлена:', {
              trackName: enrichedNft.metadata?.name,
              duration: newDuration,
              listenThreshold: Math.min(30, newDuration * 0.8)
            });
          }
        }, { once: true });

        // Добавляем обработчик успешного начала воспроизведения
        audioRef.current.addEventListener('playing', () => {
          console.log('▶️ Основной трек начал воспроизводиться');
          setIsLoadingTrack(false);
          setIsPlaying(true);
          startProgressTimer();
        }, { once: true });
        
        // Добавляем обработчик ошибки загрузки
        audioRef.current.addEventListener('error', () => {
          console.log('❌ Ошибка загрузки основного трека');
          setIsLoadingTrack(false);
          setIsPlaying(false);
        }, { once: true });

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          // Если play() успешен, но событие 'playing' может еще не сработать
          setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setIsLoadingTrack(false);
              setIsPlaying(true);
              startProgressTimer();
            }
          }, 100);
        }
      } catch (error) {
        console.error('❌ Ошибка воспроизведения:', error);
        setIsLoadingTrack(false);
        setIsPlaying(false);
      }
    }

    // Предзагружаем следующий трек
    if (orderedPlaylist.length > 1) {
      preloadNextTrack(startIndex);
    }
  };

  const startProgressTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!audioRef.current) {
        // Fallback режим без аудио элемента
        setCurrentTime(prev => {
          const newTime = prev + 1;
          
          // Условия для записи прослушивания:
          // 1. Прослушано 30+ секунд ИЛИ
          // 2. Прослушано 80%+ от общей длительности трека (для коротких треков)
          const listenThreshold = Math.min(30, duration * 0.8);
          
          if (newTime >= listenThreshold && !listenRecordedRef.current && currentNft) {
            console.log('⏰ Условие прослушивания выполнено (fallback режим):', {
              currentTime: newTime,
              duration,
              threshold: listenThreshold,
              trackName: currentNft.metadata?.name,
              nftAddress: currentNft.address,
              collectionAddress: currentNft.collection?.address
            });
            listenRecordedRef.current = true;
            recordListen(currentNft);
          }
          
          if (newTime >= duration - 1) {
            console.log('🔄 Трек завершен (fallback), переключаемся на следующий');
            playNextTrackRef.current?.();
            return 0;
          }
          setProgress((newTime / duration) * 100);
          return newTime;
        });
        return;
      }

      // Основной режим с аудио элементом
      const actualTime = audioRef.current.currentTime;
      const actualDuration = audioRef.current.duration || duration;
      
      // Условия для записи прослушивания:
      // 1. Прослушано 30+ секунд ИЛИ
      // 2. Прослушано 80%+ от общей длительности трека (для коротких треков)
      const listenThreshold = Math.min(30, actualDuration * 0.8);
      
      if (actualTime >= listenThreshold && !listenRecordedRef.current && currentNft) {
        console.log('⏰ Условие прослушивания выполнено:', {
          actualTime,
          actualDuration,
          threshold: listenThreshold,
          trackName: currentNft.metadata?.name,
          nftAddress: currentNft.address,
          collectionAddress: currentNft.collection?.address
        });
        
        // ВАЖНО: Создаем копию currentNft на момент записи для избежания race conditions
        const nftToRecord = { ...currentNft };
        listenRecordedRef.current = true;
        recordListen(nftToRecord);
      }
      
      // Проверяем, достигли ли конца трека
      if (actualTime >= actualDuration - 0.5) {
        console.log('🔄 Трек завершен, переключаемся на следующий');
        
        // Если трек завершен, но прослушивание еще не записано (очень короткий трек)
        if (!listenRecordedRef.current && currentNft && actualTime >= actualDuration * 0.5) {
          console.log('📝 Записываем прослушивание для завершенного короткого трека');
          const nftToRecord = { ...currentNft };
          listenRecordedRef.current = true;
          recordListen(nftToRecord);
        }
        
        playNextTrackRef.current?.();
        return;
      }
      
      // Обновляем прогресс и время только если аудио играет
      if (!audioRef.current.paused) {
        setCurrentTime(actualTime);
        setProgress((actualTime / actualDuration) * 100);
        
        // Обновляем длительность, если она изменилась
        if (actualDuration !== duration && !isNaN(actualDuration)) {
          setDuration(actualDuration);
        }
      }
    }, 1000);
  }, [duration, currentNft, recordListen]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('❌ Ошибка воспроизведения:', error);
          setIsPlaying(false);
        });
      }
      startProgressTimer();
    }
  }, [isPlaying, startProgressTimer]);

  const seekTo = useCallback((percentage: number) => {
    const newTime = (percentage / 100) * duration;
    
    console.log('⏩ Seeking to:', { percentage, newTime, duration });
    
    // Обновляем состояние
    setCurrentTime(newTime);
    setProgress(percentage);
    
    // Применяем к аудио элементу
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    // Перезапускаем таймер прогресса, если музыка играет
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      startProgressTimer();
    }
  }, [duration, isPlaying, startProgressTimer]);

  const closePlayer = () => {
    if (currentNft?.audioUrl) {
      URL.revokeObjectURL(currentNft.audioUrl);
    }

    setIsPlayerVisible(false);
    setIsPlaying(false);
    setCurrentNft(null);
    setCurrentTrackIndex(-1);
    setIsLoadingTrack(false);
    listenRecordedRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  // Улучшенная функция переключения на следующий трек
  const playNextTrack = async () => {
    if (playlist.length === 0) {
      console.log('🔴 Плейлист пуст, закрываем плеер');
      closePlayer();
      return;
    }
    
    if (!token) {
      console.error('❌ Отсутствует токен авторизации');
      return;
    }
    
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    const nextNft = playlist[nextIndex];
    const cacheKey = getNftCacheKey(nextNft);
    
    console.log('⏭️ Переключаемся на следующий трек:', {
      currentIndex: currentTrackIndex,
      nextIndex,
      trackName: nextNft.metadata?.name,
      playlistLength: playlist.length,
      collectionAddress: nextNft.collection?.address
    });

    if (!isMountedRef.current) return;
    
    // КРИТИЧЕСКИ ВАЖНО: Сбрасываем флаг записи прослушивания для НОВОГО трека
    listenRecordedRef.current = false;
    
    // Устанавливаем состояние загрузки
    setIsLoadingTrack(true);
    setIsPlaying(false); // ВАЖНО: ставим на паузу пока не загрузился трек
    
    setCurrentTrackIndex(nextIndex);
    setCurrentNft(nextNft);
    setProgress(0);
    setCurrentTime(0);
    setDuration(180);
    
    try {
      let audioUrl: string;
      
      // Проверяем кеш
      if (musicCache.has(cacheKey)) {
        audioUrl = musicCache.get(cacheKey)!;
        console.log('💾 Используем закешированный трек');
      } else {
        console.log('🎼 Генерируем музыку для следующего трека');
        audioUrl = await generateMusicWithToken(nextNft, token);
        musicCache.set(cacheKey, audioUrl);
      }
      
      // Воспроизводим следующий трек
      if (audioRef.current) {
        await audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        
        // Обновляем длительность
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            const newDuration = audioRef.current.duration || 180;
            setDuration(newDuration);
            console.log('📊 Длительность следующего трека:', {
              trackName: nextNft.metadata?.name,
              duration: newDuration
            });
          }
        }, { once: true });
        
        // Добавляем обработчик успешного начала воспроизведения
        audioRef.current.addEventListener('playing', () => {
          console.log('▶️ Трек начал воспроизводиться');
          setIsLoadingTrack(false);
          setIsPlaying(true);
          startProgressTimer();
        }, { once: true });
        
        // Добавляем обработчик ошибки загрузки
        audioRef.current.addEventListener('error', () => {
          console.log('❌ Ошибка загрузки трека');
          setIsLoadingTrack(false);
          setIsPlaying(false);
        }, { once: true });
        
        // Пытаемся начать воспроизведение
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          // Если play() успешен, но событие 'playing' может еще не сработать
          // Устанавливаем небольшую задержку для корректной работы
          setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setIsLoadingTrack(false);
              setIsPlaying(true);
              startProgressTimer();
            }
          }, 100);
        }
      }
      
      // Предзагружаем следующий трек
      preloadNextTrack();

    } catch (error) {
      console.error('❌ Ошибка воспроизведения следующего трека:', error);
      setIsLoadingTrack(false);
      setIsPlaying(false);
      
      // Пробуем пропустить проблемный трек
      if (playlist.length > 1) {
        const skipIndex = (nextIndex + 1) % playlist.length;
        if (skipIndex !== currentTrackIndex) { // Избегаем бесконечной рекурсии
          console.log('⏭️ Пропускаем проблемный трек, пробуем следующий');
          await playNextTrack();
        } else {
          closePlayer();
        }
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
    
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    const prevNft = playlist[prevIndex];
    const cacheKey = getNftCacheKey(prevNft);
    
    console.log('⏮️ Переключаемся на предыдущий трек:', {
      currentIndex: currentTrackIndex,
      prevIndex,
      trackName: prevNft.metadata?.name,
      playlistLength: playlist.length,
      collectionAddress: prevNft.collection?.address
    });

    if (!isMountedRef.current) return;
    
    // Сбрасываем флаг записи прослушивания для нового трека
    listenRecordedRef.current = false;
    
    // Устанавливаем состояние загрузки
    setIsLoadingTrack(true);
    setIsPlaying(false); // ВАЖНО: ставим на паузу пока не загрузился трек
    
    setCurrentTrackIndex(prevIndex);
    setCurrentNft(prevNft);
    setProgress(0);
    setCurrentTime(0);
    setDuration(180);
    
    try {
      let audioUrl: string;
      
      // Проверяем кеш
      if (musicCache.has(cacheKey)) {
        audioUrl = musicCache.get(cacheKey)!;
        console.log('💾 Используем закешированный трек');
      } else {
        console.log('🎼 Генерируем музыку для предыдущего трека');
        audioUrl = await generateMusicWithToken(prevNft, token);
        musicCache.set(cacheKey, audioUrl);
      }
      
      // Воспроизводим предыдущий трек
      if (audioRef.current) {
        await audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        
        // Обновляем длительность
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 180);
          }
        }, { once: true });
        
        // Добавляем обработчик успешного начала воспроизведения
        audioRef.current.addEventListener('playing', () => {
          console.log('▶️ Предыдущий трек начал воспроизводиться');
          setIsLoadingTrack(false);
          setIsPlaying(true);
          startProgressTimer();
        }, { once: true });
        
        // Добавляем обработчик ошибки загрузки
        audioRef.current.addEventListener('error', () => {
          console.log('❌ Ошибка загрузки предыдущего трека');
          setIsLoadingTrack(false);
          setIsPlaying(false);
        }, { once: true });
        
        // Пытаемся начать воспроизведение
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          // Если play() успешен, но событие 'playing' может еще не сработать
          setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setIsLoadingTrack(false);
              setIsPlaying(true);
              startProgressTimer();
            }
          }, 100);
        }
      }
      
      // Предзагружаем следующий трек
      if (playlist.length > 1) {
        preloadNextTrack(prevIndex);
      }
      
    } catch (error) {
      console.error('❌ Ошибка воспроизведения предыдущего трека:', error);
      setIsLoadingTrack(false);
      setIsPlaying(false);
      
      // Пробуем пропустить проблемный трек
      if (playlist.length > 1) {
        const skipIndex = (prevIndex - 1 + playlist.length) % playlist.length;
        if (skipIndex !== currentTrackIndex) { // Избегаем бесконечной рекурсии
          console.log('⏮️ Пропускаем проблемный трек, пробуем предыдущий');
          await playPreviousTrack();
        } else {
          closePlayer();
        }
      } else {
        closePlayer();
      }
    }
  };

  // Обновление плейлиста
  const updatePlaylist = useCallback((nfts: NFT[]) => {
    playlistManager.updatePlaylist(nfts);
  }, [playlistManager]);

  // Исправляем зависимости в useEffect - очистка только при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Очищаем ресурсы только при размонтировании компонента
      musicCache.clear();
      listenTracker.clear();
    };
  }, []);

  // Обработка событий аудио элемента
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      console.log('🔄 Аудио трек завершен, переключаемся на следующий');
      playNextTrack();
    };

    const handleError = (e: Event) => {
      console.error('❌ Ошибка воспроизведения аудио:', e);
      setIsPlaying(false);
      setIsLoadingTrack(false);
      // Пробуем переключиться на следующий трек при ошибке
      if (playlist.length > 1) {
        setTimeout(() => playNextTrack(), 1000);
      }
    };

    const handleLoadStart = () => {
      console.log('⏳ Начало загрузки аудио');
    };

    const handleCanPlay = () => {
      console.log('✅ Аудио готово к воспроизведению');
    };

    const handleLoadedMetadata = () => {
      console.log('📊 Метаданные аудио загружены, длительность:', audio.duration);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []); // Пустой массив зависимостей!

  // Значение контекста
  const value: PlayerContextType = {
    // Состояние
    currentNft: playlistManager.getCurrentTrack(),
    isPlaying: audioPlayer.state.isPlaying,
    isPlayerVisible,
    progress,
    duration,
    currentTime,
    volume,
    isMuted,
    playlist,
    isLoadingTrack,
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
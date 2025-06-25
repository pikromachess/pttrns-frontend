import { 
  createContext, 
  useContext, 
  useState, 
  useRef, 
  useEffect, 
  useCallback  
} from 'react';

import type { PlayerContextType, PlayerProviderProps } from '../types/player';
import type { NFT } from '../types/nft';
import { BackendTokenContext } from '../BackendTokenContext';
import { backendApi } from '../backend-api';

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Кеш для музыкальных API ключей
let musicApiKeyCache: {
  key: string;
  expiresAt: Date;
  serverUrl: string;
} | null = null;

// Кеш для сгенерированной музыки
const musicCache = new Map<string, string>();

// Трекер прослушиваний для избежания дублирования - используем Set с временными метками
const listenTracker = new Map<string, number>();

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [currentNft, setCurrentNft] = useState<NFT | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const isMountedRef = useRef(true);
  const playNextTrackRef = useRef<(() => Promise<void>) | null>(null);
  const listenRecordedRef = useRef(false);

  // Функция для записи прослушивания с улучшенной логикой
  const recordListen = useCallback(async (nft: NFT) => {
    console.log('🎵 Попытка записи прослушивания для NFT:', {
      name: nft.metadata?.name,
      address: nft.address,
      collectionAddress: nft.collection?.address
    });

    if (!nft.address || !nft.collection?.address) {
      console.warn('❌ Недостаточно данных для записи прослушивания:', {
        hasAddress: !!nft.address,
        hasCollectionAddress: !!nft.collection?.address
      });
      return;
    }

    const now = Date.now();
    const lastRecorded = listenTracker.get(nft.address);
    
    // Проверяем, что с последней записи прошло минимум 30 секунд
    if (lastRecorded && (now - lastRecorded) < 30000) {
      console.log('⏰ Прослушивание уже записано недавно для этого NFT');
      return;
    }

    try {
      listenTracker.set(nft.address, now);
      
      console.log('📤 Отправляем запрос на запись прослушивания:', {
        nftAddress: nft.address,
        collectionAddress: nft.collection.address
      });
      
      const success = await backendApi.recordListen(nft.address, nft.collection.address);
      
      if (success) {
        console.log('✅ Прослушивание успешно записано для NFT:', nft.metadata?.name);
      } else {
        console.error('❌ Ошибка записи прослушивания - сервер вернул false');
        // Убираем из трекера при ошибке, чтобы можно было попробовать еще раз
        listenTracker.delete(nft.address);
      }
    } catch (error) {
      console.error('❌ Ошибка при записи прослушивания:', error);
      // Убираем из трекера при ошибке, чтобы можно было попробовать еще раз
      listenTracker.delete(nft.address);
    }
  }, []);

  // Обновляем громкость аудио элемента при изменении состояния
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Функция для изменения громкости
  const changeVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, [isMuted]);

  // Функция для переключения режима без звука
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolume);
      if (audioRef.current) {
        audioRef.current.volume = previousVolume;
      }
    } else {
      setPreviousVolume(volume);
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  }, [isMuted, volume, previousVolume]);

  // Обновленная функция для формирования плейлиста
  const updatePlaylist = useCallback((nfts: NFT[]) => {
    console.log('📝 Обновляем плейлист:', nfts.length, 'треков');
    setPlaylist(nfts);
    
    // Если есть текущий трек, находим его индекс в новом плейлисте
    if (currentNft) {
      const newIndex = nfts.findIndex(nft => 
        nft.address === currentNft.address || nft.index === currentNft.index
      );
      if (newIndex !== -1) {
        setCurrentTrackIndex(newIndex);
      }
    }
  }, [currentNft]);

  // Функция для получения кеш-ключа NFT
  const getNftCacheKey = useCallback((nft: NFT): string => {
    return nft.address || `index-${nft.index}`;
  }, []);

  // Предзагрузка следующего трека
  const preloadNextTrack = useCallback(async (index: number) => {
    if (!token || playlist.length === 0) return;
    
    const nextIndex = (index + 1) % playlist.length;
    const nextNft = playlist[nextIndex];
    const cacheKey = getNftCacheKey(nextNft);
    
    // Если трек уже закеширован, не генерируем повторно
    if (musicCache.has(cacheKey)) {
      console.log('💾 Следующий трек уже закеширован:', nextNft.metadata?.name);
      return;
    }
    
    try {
      console.log('⏳ Предзагружаем следующий трек:', nextNft.metadata?.name);
      const audioUrl = await generateMusicWithToken(nextNft, token);
      musicCache.set(cacheKey, audioUrl);
      console.log('✅ Следующий трек успешно предзагружен');
    } catch (error) {
      console.error('❌ Ошибка предзагрузки следующего трека:', error);
    }
  }, [token, playlist, getNftCacheKey]);

  // Основная функция воспроизведения с правильной логикой загрузки
  const playNft = async (nft: NFT, nfts: NFT[] = []) => {
    console.log('🎯 Запуск воспроизведения NFT:', {
      name: nft.metadata?.name,
      address: nft.address,
      collectionAddress: nft.collection?.address,
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
      if (playlist.length > 1) {
        preloadNextTrack(nextIndex);
      }
      
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
  };

  useEffect(() => {
    playNextTrackRef.current = playNextTrack;
  }, [playNextTrack]);

  // Улучшенная функция переключения на предыдущий трек
  const playPreviousTrack = async () => {
    if (playlist.length === 0) {
      console.log('🔴 Плейлист пуст, закрываем плеер');
      closePlayer();
      return;
    }
    
    if (!token) {
      console.error('❌ Отсутствует токен авторизации');
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

  // Очистка при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      // Очищаем кеш музыки при размонтировании
      musicCache.clear();
      // Очищаем трекер прослушиваний
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
  }, [currentTrackIndex, playlist, playNextTrack]);

  const value: PlayerContextType = {
    currentNft,
    isPlaying,
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
      <audio 
        ref={audioRef} 
        preload="metadata"
        crossOrigin="anonymous"
      />
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

// Создаем отдельную функцию для генерации музыки с токеном
export const generateMusicWithToken = async (nft: NFT, authToken: string): Promise<string> => {
  try {
    // Проверяем кеш музыкального API ключа
    let apiKey: string | null = null;
    let serverUrl: string | null = null;

    if (musicApiKeyCache && new Date() < musicApiKeyCache.expiresAt) {
      apiKey = musicApiKeyCache.key;
      serverUrl = musicApiKeyCache.serverUrl;
    } else {
      // Получаем новый музыкальный API ключ
      console.log('🔑 Получение нового музыкального API ключа...');
      const keyData = await backendApi.generateMusicApiKey(authToken);
      
      if (!keyData) {
        throw new Error('Не удалось получить музыкальный API ключ');
      }

      musicApiKeyCache = {
        key: keyData.apiKey,
        expiresAt: new Date(keyData.expiresAt),
        serverUrl: keyData.musicServerUrl
      };

      apiKey = keyData.apiKey;
      serverUrl = keyData.musicServerUrl;
    }

    console.log('🎼 Отправляем запрос на генерацию музыки с API ключом для NFT:', nft.metadata?.name);
    
    const response = await fetch(`${serverUrl}/generate-music-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Music-Api-Key': apiKey,
      },
      body: JSON.stringify({
        metadata: nft.metadata,
        index: nft.index
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Ключ истек, очищаем кеш и пробуем еще раз
        musicApiKeyCache = null;
        console.log('🔑 API ключ истек, получаем новый...');
        
        const keyData = await backendApi.generateMusicApiKey(authToken);
        if (!keyData) {
          throw new Error('Не удалось обновить музыкальный API ключ');
        }

        musicApiKeyCache = {
          key: keyData.apiKey,
          expiresAt: new Date(keyData.expiresAt),
          serverUrl: keyData.musicServerUrl
        };

        // Повторный запрос с новым ключом
        const retryResponse = await fetch(`${keyData.musicServerUrl}/generate-music-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Music-Api-Key': keyData.apiKey,
          },
          body: JSON.stringify({
            metadata: nft.metadata,
            index: nft.index
          })
        });

        if (!retryResponse.ok) {
          throw new Error(`Ошибка сервера после обновления ключа: ${retryResponse.status}`);
        }

        const audioBlob = await retryResponse.blob();
        return URL.createObjectURL(audioBlob);
      } else if (response.status === 403) {
        throw new Error('Нет доступа к генерации музыки');
      } else if (response.status === 503) {
        throw new Error('Сервис генерации музыки временно недоступен');
      }
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const audioBlob = await response.blob();
    console.log('✅ Музыка успешно сгенерирована для NFT:', nft.metadata?.name);
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('❌ Ошибка генерации музыки:', error);
    throw error;
  }
};
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
import { backendApi } from '../backend-api';

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Кеш для сгенерированной музыки (ключ: sessionId + nftAddress/index)
const musicCache = new Map<string, string>();

// Трекер прослушиваний для избежания дублирования
const listenTracker = new Map<string, number>();

// Функция для записи прослушивания через сессию
const recordListenWithSession = async (nft: NFT, sessionId: string) => {
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
    return;
  }

  try {
    listenTracker.set(nft.address, now);
    
    const response = await fetch('/api/session-listens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`
      },
      body: JSON.stringify({
        nftAddress: nft.address,
        timestamp: now
      })
    });

    if (!response.ok) {
      listenTracker.delete(nft.address);
      
      if (response.status === 401) {
        console.error('❌ Сессия истекла при записи прослушивания');
      } else if (response.status === 429) {
        console.warn('⚠️ Превышен лимит запросов на прослушивания');
      } else {
        console.error('❌ Ошибка при записи прослушивания:', response.status);
      }
    } else {
      const result = await response.json();
      console.log('✅ Прослушивание записано:', result);
    }
  } catch (error) {
    console.error('❌ Ошибка при записи прослушивания:', error);
    listenTracker.delete(nft.address);
  }
};

// НОВАЯ функция для генерации музыки через сессию (заменяет generateMusicWithToken)
const generateMusicWithSession = async (nft: NFT, sessionId: string, musicServerUrl: string): Promise<string> => {
  try {
    console.log('🎵 Генерация музыки через сессию:', {
      nftName: nft.metadata?.name,
      sessionId: sessionId.slice(0, 20) + '...',
      musicServerUrl
    });
    
    const response = await fetch(`${musicServerUrl}/generate-music-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`,
      },
      body: JSON.stringify({
        metadata: nft.metadata,
        index: nft.index,
        address: nft.address
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Сессия истекла');
      } else if (response.status === 403) {
        throw new Error('Нет доступа к генерации музыки');
      } else if (response.status === 429) {
        throw new Error('Превышен лимит запросов');
      } else if (response.status === 503) {
        throw new Error('Сервис генерации музыки временно недоступен');
      }
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const audioBlob = await response.blob();
    console.log('✅ Музыка сгенерирована успешно');
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('❌ Ошибка генерации музыки:', error);
    throw error;
  }
};

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
  const isMountedRef = useRef(true);
  const playNextTrackRef = useRef<(() => Promise<void>) | null>(null);
  const listenRecordedRef = useRef(false);
  const actualPlaytimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);

  // Функция для записи прослушивания с улучшенной логикой
  const recordListen = useCallback(async (nft: NFT) => {    
    if (!nft.address || !nft.collection?.address) {
      console.warn('❌ Недостаточно данных для записи прослушивания:', {
        hasAddress: !!nft.address,
        hasCollectionAddress: !!nft.collection?.address
      });
      return;
    }

    const now = Date.now();
    const lastRecorded = listenTracker.get(nft.address);
    
    if (lastRecorded && (now - lastRecorded) < 30000) {      
      return;
    }

    try {
      listenTracker.set(nft.address, now);
      
      // Используем сессионную запись если есть sessionId, иначе fallback на старую
      if (nft.sessionId) {
        await recordListenWithSession(nft, nft.sessionId);
      } else {
        // Fallback на старый метод
        const success = await backendApi.recordListen(nft.address, nft.collection.address);
        if (!success) {
          listenTracker.delete(nft.address);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при записи прослушивания:', error);
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
    setPlaylist(nfts);
    
    if (currentNft) {
      const newIndex = nfts.findIndex(nft => 
        nft.address === currentNft.address || nft.index === currentNft.index
      );
      if (newIndex !== -1) {
        setCurrentTrackIndex(newIndex);
      }
    }
  }, [currentNft]);

  // Функция для получения кеш-ключа NFT (ОБНОВЛЕНА для работы с сессиями)
  const getNftCacheKey = useCallback((nft: NFT, sessionId?: string): string => {
    const baseKey = nft.address || `index-${nft.index}`;
    return sessionId ? `${sessionId}-${baseKey}` : baseKey;
  }, []);

  // НОВАЯ функция предзагрузки следующего трека через сессию
  const preloadNextTrack = useCallback(async (index: number) => {
    if (playlist.length === 0) return;
    
    const nextIndex = (index + 1) % playlist.length;
    const nextNft = playlist[nextIndex];
    
    // Ищем сессионные данные по той же логике
    let sessionId = nextNft.sessionId;
    let musicServerUrl = nextNft.musicServerUrl;
    
    if (!sessionId || !musicServerUrl) {
      // Пробуем взять из текущего NFT
      if (currentNft?.sessionId && currentNft?.musicServerUrl) {
        sessionId = currentNft.sessionId;
        musicServerUrl = currentNft.musicServerUrl;
      } else {
        // Ищем любой NFT в плейлисте с сессионными данными
        const nftWithSession = playlist.find(nft => nft.sessionId && nft.musicServerUrl);
        if (nftWithSession) {
          sessionId = nftWithSession.sessionId;
          musicServerUrl = nftWithSession.musicServerUrl;
        }
      }
    }
    
    if (!sessionId || !musicServerUrl) {
      console.log('⚠️ Нет сессионных данных для предзагрузки');
      return;
    }
    
    const cacheKey = getNftCacheKey(nextNft, sessionId);
    
    // Если трек уже закеширован, не генерируем повторно
    if (musicCache.has(cacheKey)) {      
      return;
    }
    
    try {
      console.log('🔄 Предзагружаем следующий трек:', nextNft.metadata?.name);
      const audioUrl = await generateMusicWithSession(
        nextNft, 
        sessionId, 
        musicServerUrl
      );
      musicCache.set(cacheKey, audioUrl);
      console.log('✅ Следующий трек предзагружен успешно');
    } catch (error) {
      console.error('❌ Ошибка предзагрузки следующего трека:', error);
    }
  }, [playlist, currentNft, getNftCacheKey]);

  // Основная функция воспроизведения (ОБНОВЛЕНА)
  const playNft = async (nft: NFT, nfts: NFT[] = []) => {    
    
    // Сбрасываем все счетчики для НОВОГО трека
    listenRecordedRef.current = false;
    actualPlaytimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
    
    // Обогащаем NFT информацией о коллекции если нужно
    let enrichedNft = { ...nft };
    
    if (!enrichedNft.collection?.address && nfts.length > 0) {
      const nftInPlaylist = nfts.find(n => n.address === nft.address);
      if (nftInPlaylist?.collection?.address) {
        enrichedNft.collection = nftInPlaylist.collection;
      }
    }
    
    // Формируем плейлист в правильном порядке
    const orderedPlaylist = nfts.length > 0 ? nfts : [enrichedNft];
    const selectedIndex = orderedPlaylist.findIndex(item => 
      item.address === enrichedNft.address || 
      (item.index === enrichedNft.index && !item.address && !enrichedNft.address)
    );
    
    const startIndex = selectedIndex !== -1 ? selectedIndex : 0;   
    
    setPlaylist(orderedPlaylist);
    setCurrentTrackIndex(startIndex);
    setCurrentNft(enrichedNft);
    setIsPlayerVisible(true);
    
    setIsLoadingTrack(true);
    setIsPlaying(false);
    
    setProgress(0);
    setCurrentTime(0);
    setDuration(180);

    // Получаем аудио URL для текущего трека
    const sessionId = enrichedNft.sessionId;
    const musicServerUrl = enrichedNft.musicServerUrl;
    
    let cacheKey: string;
    let audioUrl: string;

    if (sessionId) {
      // Новая логика с сессиями
      cacheKey = getNftCacheKey(enrichedNft, sessionId);
      
      if (musicCache.has(cacheKey)) {
        audioUrl = musicCache.get(cacheKey)!;
        console.log('🎵 Используем кешированную музыку (сессия):', enrichedNft.metadata?.name);
      } else if (enrichedNft.audioUrl) {
        audioUrl = enrichedNft.audioUrl;
        musicCache.set(cacheKey, audioUrl);
        console.log('🎵 Добавляем существующий audioUrl в кеш (сессия):', enrichedNft.metadata?.name);
      } else {
        try {
          console.log('🎵 Генерируем новую музыку через сессию:', enrichedNft.metadata?.name);
          audioUrl = await generateMusicWithSession(enrichedNft, sessionId, musicServerUrl!);
          musicCache.set(cacheKey, audioUrl);
        } catch (error) {
          console.error('❌ Ошибка генерации музыки через сессию:', error);
          setIsLoadingTrack(false);
          setIsPlaying(false);
          return;
        }
      }
    } else {
      // Fallback на старую логику для совместимости
      cacheKey = getNftCacheKey(enrichedNft);
      
      if (musicCache.has(cacheKey)) {
        audioUrl = musicCache.get(cacheKey)!;
        console.log('🎵 Используем кешированную музыку (старая логика):', enrichedNft.metadata?.name);
      } else if (enrichedNft.audioUrl) {
        audioUrl = enrichedNft.audioUrl;
        musicCache.set(cacheKey, audioUrl);
        console.log('🎵 Добавляем существующий audioUrl в кеш (старая логика):', enrichedNft.metadata?.name);
      } else {
        console.error('❌ Нет сессионных данных и audioUrl для генерации музыки');
        setIsLoadingTrack(false);
        setIsPlaying(false);
        return;
      }
    }

    // Воспроизводим текущий трек
    if (audioRef.current && audioUrl) {
      try {
        await audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        
        // Обработчики событий аудио
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            const newDuration = audioRef.current.duration || 180;
            setDuration(newDuration);            
          }
        }, { once: true });

        audioRef.current.addEventListener('playing', () => {          
          setIsLoadingTrack(false);
          setIsPlaying(true);
          actualPlaytimeRef.current = 0;
          lastUpdateTimeRef.current = Date.now();
          startProgressTimer();
        }, { once: true });
        
        audioRef.current.addEventListener('error', () => {          
          setIsLoadingTrack(false);
          setIsPlaying(false);
        }, { once: true });

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setIsLoadingTrack(false);
              setIsPlaying(true);
              actualPlaytimeRef.current = 0;
              lastUpdateTimeRef.current = Date.now();
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

    // Предзагружаем следующий трек (ИСПРАВЛЕНО)
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
        setCurrentTime(prev => {
          const newTime = prev + 1;
          
          if (isPlaying) {
            actualPlaytimeRef.current += 1;
          }
          
          const listenThreshold = Math.min(30, duration * 0.8);
          
          if (actualPlaytimeRef.current >= listenThreshold && !listenRecordedRef.current && currentNft) {
            const nftToRecord = { ...currentNft };
            listenRecordedRef.current = true;
            recordListen(nftToRecord);
          }
          
          if (newTime >= duration - 1) {            
            playNextTrackRef.current?.();
            return 0;
          }
          setProgress((newTime / duration) * 100);
          return newTime;
        });
        return;
      }

      const actualTime = audioRef.current.currentTime;
      const actualDuration = audioRef.current.duration || duration;
      
      if (!audioRef.current.paused && isPlaying) {
        const now = Date.now();
        if (lastUpdateTimeRef.current > 0) {
          const deltaSeconds = (now - lastUpdateTimeRef.current) / 1000;
          actualPlaytimeRef.current += Math.min(deltaSeconds, 1.2);
        }
        lastUpdateTimeRef.current = now;
      }
      
      const listenThreshold = Math.min(30, actualDuration * 0.8);
      
      if (actualPlaytimeRef.current >= listenThreshold && !listenRecordedRef.current && currentNft) {       
        const nftToRecord = { ...currentNft };
        listenRecordedRef.current = true;
        recordListen(nftToRecord);
      }
      
      if (actualTime >= actualDuration - 0.5) {
        if (!listenRecordedRef.current && currentNft && actualPlaytimeRef.current >= actualDuration * 0.5) {         
          const nftToRecord = { ...currentNft };
          listenRecordedRef.current = true;
          recordListen(nftToRecord);
        }
        
        playNextTrackRef.current?.();
        return;
      }
      
      if (!audioRef.current.paused) {
        setCurrentTime(actualTime);
        setProgress((actualTime / actualDuration) * 100);
        
        if (actualDuration !== duration && !isNaN(actualDuration)) {
          setDuration(actualDuration);
        }
      }
    }, 1000);
  }, [duration, currentNft, recordListen, isPlaying]);

  const togglePlay = useCallback(() => {
    const now = Date.now();
    
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      lastUpdateTimeRef.current = 0;
    } else {
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('❌ Ошибка воспроизведения:', error);
          setIsPlaying(false);
        });
      }
      lastUpdateTimeRef.current = now;
      startProgressTimer();
    }
  }, [isPlaying, startProgressTimer]);

  const seekTo = useCallback((percentage: number) => {
    const newTime = (percentage / 100) * duration;   
    
    setCurrentTime(newTime);
    setProgress(percentage);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    lastUpdateTimeRef.current = Date.now();
    
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
    actualPlaytimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  // ОБНОВЛЕННАЯ функция переключения на следующий трек
  const playNextTrack = async () => {
    if (playlist.length === 0) {      
      closePlayer();
      return;
    }
    
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    const nextNft = playlist[nextIndex];
    
    if (!isMountedRef.current) return;
    
    console.log('⏭️ Переключение на следующий трек:', {
      nextIndex,
      nextNft: nextNft.metadata?.name,
      hasSessionId: !!nextNft.sessionId,
      hasMusicServerUrl: !!nextNft.musicServerUrl,
      currentNftSessionId: !!currentNft?.sessionId,
      playlistLength: playlist.length
    });
    
    // Сбрасываем все счетчики для НОВОГО трека
    listenRecordedRef.current = false;
    actualPlaytimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
    
    setIsLoadingTrack(true);
    setIsPlaying(false);
    
    setCurrentTrackIndex(nextIndex);
    setCurrentNft(nextNft);
    setProgress(0);
    setCurrentTime(0);
    setDuration(180);
    
    try {
      let audioUrl: string;
      
      // ИСПРАВЛЕНО: Сначала проверяем сессионные данные в nextNft, затем в currentNft, затем в плейлисте
      let sessionId = nextNft.sessionId;
      let musicServerUrl = nextNft.musicServerUrl;
      
      // Если у следующего NFT нет сессионных данных, ищем их в других источниках
      if (!sessionId || !musicServerUrl) {
        // Пробуем взять из текущего NFT
        if (currentNft?.sessionId && currentNft?.musicServerUrl) {
          sessionId = currentNft.sessionId;
          musicServerUrl = currentNft.musicServerUrl;
          console.log('🔄 Используем сессионные данные из currentNft');
        } else {
          // Ищем любой NFT в плейлисте с сессионными данными
          const nftWithSession = playlist.find(nft => nft.sessionId && nft.musicServerUrl);
          if (nftWithSession) {
            sessionId = nftWithSession.sessionId;
            musicServerUrl = nftWithSession.musicServerUrl;
            console.log('🔄 Используем сессионные данные из плейлиста');
          }
        }
      }
      
      if (sessionId && musicServerUrl) {
        console.log('✅ Найдены сессионные данные для генерации музыки');
        
        // Новая логика с сессиями
        const cacheKey = getNftCacheKey(nextNft, sessionId);
        
        if (musicCache.has(cacheKey)) {
          audioUrl = musicCache.get(cacheKey)!;
          console.log('🎵 Используем кешированную музыку для следующего трека');
        } else {
          console.log('🎵 Генерируем музыку для следующего трека...');
          audioUrl = await generateMusicWithSession(nextNft, sessionId, musicServerUrl);
          musicCache.set(cacheKey, audioUrl);
        }
        
        // ВАЖНО: Обновляем nextNft с сессионными данными для последующих переключений
        const updatedNextNft = {
          ...nextNft,
          sessionId,
          musicServerUrl
        };
        setCurrentNft(updatedNextNft);
        
        // Также обновляем плейлист, если у NFT не было сессионных данных
        if (!nextNft.sessionId || !nextNft.musicServerUrl) {
          const updatedPlaylist = playlist.map((nft, index) => 
            index === nextIndex ? updatedNextNft : nft
          );
          setPlaylist(updatedPlaylist);
        }
        
      } else {
        console.error('❌ Не найдены сессионные данные ни в одном источнике:', {
          nextNftSessionId: !!nextNft.sessionId,
          nextNftMusicServer: !!nextNft.musicServerUrl,
          currentNftSessionId: !!currentNft?.sessionId,
          currentNftMusicServer: !!currentNft?.musicServerUrl,
          playlistWithSessions: playlist.filter(nft => nft.sessionId && nft.musicServerUrl).length
        });
        setIsLoadingTrack(false);
        setIsPlaying(false);
        return;
      }
      
      // Воспроизводим следующий трек
      if (audioRef.current) {
        await audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            const newDuration = audioRef.current.duration || 180;
            setDuration(newDuration);            
          }
        }, { once: true });
        
        audioRef.current.addEventListener('playing', () => {          
          setIsLoadingTrack(false);
          setIsPlaying(true);
          actualPlaytimeRef.current = 0;
          lastUpdateTimeRef.current = Date.now();
          startProgressTimer();
        }, { once: true });
        
        audioRef.current.addEventListener('error', () => {          
          setIsLoadingTrack(false);
          setIsPlaying(false);
        }, { once: true });
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setIsLoadingTrack(false);
              setIsPlaying(true);
              actualPlaytimeRef.current = 0;
              lastUpdateTimeRef.current = Date.now();
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
      
      if (playlist.length > 1) {
        const skipIndex = (nextIndex + 1) % playlist.length;
        if (skipIndex !== currentTrackIndex) {          
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

  // ОБНОВЛЕННАЯ функция переключения на предыдущий трек
  const playPreviousTrack = async () => {
    if (playlist.length === 0) {      
      closePlayer();
      return;
    }
    
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    const prevNft = playlist[prevIndex];

    if (!isMountedRef.current) return;
    
    console.log('⏮️ Переключение на предыдущий трек:', {
      prevIndex,
      prevNft: prevNft.metadata?.name,
      hasSessionId: !!prevNft.sessionId,
      hasMusicServerUrl: !!prevNft.musicServerUrl,
      currentNftSessionId: !!currentNft?.sessionId,
      playlistLength: playlist.length
    });
    
    listenRecordedRef.current = false;
    actualPlaytimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
    
    setIsLoadingTrack(true);
    setIsPlaying(false);
    
    setCurrentTrackIndex(prevIndex);
    setCurrentNft(prevNft);
    setProgress(0);
    setCurrentTime(0);
    setDuration(180);
    
    try {
      let audioUrl: string;
      
      // ИСПРАВЛЕНО: Аналогичная логика поиска сессионных данных
      let sessionId = prevNft.sessionId;
      let musicServerUrl = prevNft.musicServerUrl;
      
      // Если у предыдущего NFT нет сессионных данных, ищем их в других источниках
      if (!sessionId || !musicServerUrl) {
        // Пробуем взять из текущего NFT
        if (currentNft?.sessionId && currentNft?.musicServerUrl) {
          sessionId = currentNft.sessionId;
          musicServerUrl = currentNft.musicServerUrl;
          console.log('🔄 Используем сессионные данные из currentNft для предыдущего трека');
        } else {
          // Ищем любой NFT в плейлисте с сессионными данными
          const nftWithSession = playlist.find(nft => nft.sessionId && nft.musicServerUrl);
          if (nftWithSession) {
            sessionId = nftWithSession.sessionId;
            musicServerUrl = nftWithSession.musicServerUrl;
            console.log('🔄 Используем сессионные данные из плейлиста для предыдущего трека');
          }
        }
      }
      
      if (sessionId && musicServerUrl) {
        console.log('✅ Найдены сессионные данные для генерации музыки (предыдущий трек)');
        
        const cacheKey = getNftCacheKey(prevNft, sessionId);
        
        if (musicCache.has(cacheKey)) {
          audioUrl = musicCache.get(cacheKey)!;
          console.log('🎵 Используем кешированную музыку для предыдущего трека');
        } else {
          console.log('🎵 Генерируем музыку для предыдущего трека...');
          audioUrl = await generateMusicWithSession(prevNft, sessionId, musicServerUrl);
          musicCache.set(cacheKey, audioUrl);
        }
        
        // ВАЖНО: Обновляем prevNft с сессионными данными
        const updatedPrevNft = {
          ...prevNft,
          sessionId,
          musicServerUrl
        };
        setCurrentNft(updatedPrevNft);
        
        // Также обновляем плейлист, если у NFT не было сессионных данных
        if (!prevNft.sessionId || !prevNft.musicServerUrl) {
          const updatedPlaylist = playlist.map((nft, index) => 
            index === prevIndex ? updatedPrevNft : nft
          );
          setPlaylist(updatedPlaylist);
        }
        
      } else {
        console.error('❌ Не найдены сессионные данные для предыдущего трека:', {
          prevNftSessionId: !!prevNft.sessionId,
          prevNftMusicServer: !!prevNft.musicServerUrl,
          currentNftSessionId: !!currentNft?.sessionId,
          currentNftMusicServer: !!currentNft?.musicServerUrl,
          playlistWithSessions: playlist.filter(nft => nft.sessionId && nft.musicServerUrl).length
        });
        setIsLoadingTrack(false);
        setIsPlaying(false);
        return;
      }
      
      // Воспроизводим предыдущий трек
      if (audioRef.current) {
        await audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 180);
          }
        }, { once: true });
        
        audioRef.current.addEventListener('playing', () => {         
          setIsLoadingTrack(false);
          setIsPlaying(true);
          actualPlaytimeRef.current = 0;
          lastUpdateTimeRef.current = Date.now();
          startProgressTimer();
        }, { once: true });
        
        audioRef.current.addEventListener('error', () => {          
          setIsLoadingTrack(false);
          setIsPlaying(false);
        }, { once: true });
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
              setIsLoadingTrack(false);
              setIsPlaying(true);
              actualPlaytimeRef.current = 0;
              lastUpdateTimeRef.current = Date.now();
              startProgressTimer();
            }
          }, 100);
        }
      }
      
      if (playlist.length > 1) {
        preloadNextTrack(prevIndex);
      }
      
    } catch (error) {
      console.error('❌ Ошибка воспроизведения предыдущего трека:', error);
      setIsLoadingTrack(false);
      setIsPlaying(false);
      
      if (playlist.length > 1) {
        const skipIndex = (prevIndex - 1 + playlist.length) % playlist.length;
        if (skipIndex !== currentTrackIndex) {          
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
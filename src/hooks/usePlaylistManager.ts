// src/hooks/usePlaylistManager.ts
import { useState, useCallback } from 'react';
import type { NFT } from '../types/nft';
import {
  findNftIndex,
  createOrderedPlaylist,
  getNextIndex,
  getPreviousIndex,
  enrichPlaylistWithCollection,
  validatePlaylist,
  hasCollectionInfo
} from '../utils/playlistUtils';

interface UsePlaylistManagerOptions {
  onTrackChange?: (nft: NFT, index: number) => void;
  onPlaylistUpdate?: (playlist: NFT[]) => void;
}

export function usePlaylistManager(options: UsePlaylistManagerOptions = {}) {
  const { onTrackChange, onPlaylistUpdate } = options;
  
  const [playlist, setPlaylist] = useState<NFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentNft, setCurrentNft] = useState<NFT | null>(null);

  const updatePlaylist = useCallback((newPlaylist: NFT[], startNft?: NFT) => {
    // Разрешаем пустой плейлист без предупреждения
    if (newPlaylist.length === 0) {
      setPlaylist([]);
      setCurrentIndex(-1);
      setCurrentNft(null);
      onPlaylistUpdate?.([]);
      return;
    }

    if (!validatePlaylist(newPlaylist)) {
      console.warn('⚠️ Некорректный плейлист:', newPlaylist);
      return;
    }

    console.log('📝 Обновляем плейлист:', newPlaylist.length, 'треков');
    
    let processedPlaylist = [...newPlaylist];
    let startIndex = 0;

    // Если указан стартовый трек, создаем упорядоченный плейлист
    if (startNft) {
      processedPlaylist = createOrderedPlaylist(newPlaylist, startNft);
      
      // Обогащаем плейлист информацией о коллекции, если нужно
      if (startNft.collection?.address && !hasCollectionInfo(processedPlaylist)) {
        processedPlaylist = enrichPlaylistWithCollection(processedPlaylist, startNft);
        console.log('🔧 Обогатили плейлист информацией о коллекции');
      }
    } else if (currentNft) {
      // Если есть текущий трек, найдем его индекс в новом плейлисте
      const newIndex = findNftIndex(processedPlaylist, currentNft);
      if (newIndex !== -1) {
        startIndex = newIndex;
      }
    }

    setPlaylist(processedPlaylist);
    setCurrentIndex(startIndex);
    
    if (startNft) {
      setCurrentNft(startNft);
      onTrackChange?.(startNft, 0); // В упорядоченном плейлисте стартовый трек всегда первый
    }
    
    onPlaylistUpdate?.(processedPlaylist);
    
    console.log('📋 Плейлист обновлен:', {
      total: processedPlaylist.length,
      startIndex,
      currentTrack: startNft?.metadata?.name || currentNft?.metadata?.name,
      hasCollectionInfo: hasCollectionInfo(processedPlaylist)
    });
  }, [currentNft, onTrackChange, onPlaylistUpdate]);

  const setCurrentTrack = useCallback((nft: NFT, index?: number) => {
    let trackIndex = index;
    
    // Если индекс не указан, ищем трек в плейлисте
    if (trackIndex === undefined) {
      trackIndex = findNftIndex(playlist, nft);
    }
    
    if (trackIndex === -1) {
      console.warn('⚠️ Трек не найден в плейлисте:', nft.metadata?.name);
      return;
    }

    setCurrentNft(nft);
    setCurrentIndex(trackIndex);
    onTrackChange?.(nft, trackIndex);
    
    console.log('🎵 Установлен текущий трек:', {
      name: nft.metadata?.name,
      index: trackIndex,
      address: nft.address
    });
  }, [playlist, onTrackChange]);

  const getNextTrack = useCallback((): NFT | null => {
    if (playlist.length === 0) return null;
    
    const nextIndex = getNextIndex(currentIndex, playlist.length);
    return nextIndex !== -1 ? playlist[nextIndex] : null;
  }, [playlist, currentIndex]);

  const getPreviousTrack = useCallback((): NFT | null => {
    if (playlist.length === 0) return null;
    
    const prevIndex = getPreviousIndex(currentIndex, playlist.length);
    return prevIndex !== -1 ? playlist[prevIndex] : null;
  }, [playlist, currentIndex]);

  const moveToNext = useCallback((): NFT | null => {
    const nextTrack = getNextTrack();
    if (nextTrack) {
      const nextIndex = getNextIndex(currentIndex, playlist.length);
      setCurrentTrack(nextTrack, nextIndex);
    }
    return nextTrack;
  }, [getNextTrack, currentIndex, playlist.length, setCurrentTrack]);

  const moveToPrevious = useCallback((): NFT | null => {
    const prevTrack = getPreviousTrack();
    if (prevTrack) {
      const prevIndex = getPreviousIndex(currentIndex, playlist.length);
      setCurrentTrack(prevTrack, prevIndex);
    }
    return prevTrack;
  }, [getPreviousTrack, currentIndex, playlist.length, setCurrentTrack]);

  const getCurrentTrack = useCallback((): NFT | null => {
    return currentNft;
  }, [currentNft]);

  const getCurrentIndex = useCallback((): number => {
    return currentIndex;
  }, [currentIndex]);

  const getPlaylistInfo = useCallback(() => {
    return {
      length: playlist.length,
      currentIndex,
      currentTrack: currentNft,
      hasNext: playlist.length > 0 && getNextIndex(currentIndex, playlist.length) !== currentIndex,
      hasPrevious: playlist.length > 0 && getPreviousIndex(currentIndex, playlist.length) !== currentIndex,
      hasCollectionInfo: hasCollectionInfo(playlist)
    };
  }, [playlist, currentIndex, currentNft]);

  const clear = useCallback(() => {
    setPlaylist([]);
    setCurrentIndex(-1);
    setCurrentNft(null);
    console.log('🧹 Плейлист очищен');
  }, []);

  const isEmpty = useCallback((): boolean => {
    return playlist.length === 0;
  }, [playlist.length]);

  const shufflePlaylist = useCallback((keepCurrentFirst = true) => {
    if (playlist.length <= 1) return;

    const shuffled = [...playlist];

    if (keepCurrentFirst && currentNft) {
      // Удаляем текущий трек из массива для перемешивания
      const currentTrackIndex = findNftIndex(shuffled, currentNft);
      if (currentTrackIndex !== -1) {
        shuffled.splice(currentTrackIndex, 1);
      }
    }

    // Алгоритм Фишера-Йейтса для перемешивания
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Возвращаем текущий трек в начало, если нужно
    if (keepCurrentFirst && currentNft) {
      shuffled.unshift(currentNft);
    }

    setPlaylist(shuffled);
    onPlaylistUpdate?.(shuffled);
    
    console.log('🔀 Плейлист перемешан');
  }, [playlist, currentNft, onPlaylistUpdate]);

  return {
    // Состояние
    playlist,
    currentIndex,
    currentNft,

    // Управление плейлистом
    updatePlaylist,
    clear,
    shufflePlaylist,

    // Управление текущим треком
    setCurrentTrack,
    getCurrentTrack,
    getCurrentIndex,

    // Навигация
    getNextTrack,
    getPreviousTrack,
    moveToNext,
    moveToPrevious,

    // Информация
    getPlaylistInfo,
    isEmpty
  };
}
import { useRef, useCallback } from 'react';
import type { NFT } from '../types/nft';
import type { ListenTracker } from '../types/musicApi';

interface UseListenTrackerOptions {
  minListenTime?: number; // минимальное время прослушивания в секундах
  minListenPercentage?: number; // минимальный процент прослушивания
  cooldownTime?: number; // время между записями в миллисекундах
}

const DEFAULT_OPTIONS: Required<UseListenTrackerOptions> = {
  minListenTime: 30, // 30 секунд
  minListenPercentage: 0.8, // 80% трека
  cooldownTime: 30000 // 30 секунд между записями
};

export function useListenTracker(options: UseListenTrackerOptions = {}): ListenTracker {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Map для хранения времени последней записи прослушивания
  const lastRecordedRef = useRef<Map<string, number>>(new Map());
  
  // Set для хранения адресов NFT, для которых уже записано прослушивание в текущей сессии
  const recordedInSessionRef = useRef<Set<string>>(new Set());

  const getNftKey = useCallback((nft: NFT): string => {
    return nft.address || `index-${nft.index || 0}`;
  }, []);

  const canRecord = useCallback((nft: NFT): boolean => {
    if (!nft.address || !nft.collection?.address) {
      console.warn('❌ Недостаточно данных для записи прослушивания:', {
        hasAddress: !!nft.address,
        hasCollectionAddress: !!nft.collection?.address
      });
      return false;
    }

    const key = getNftKey(nft);
    const now = Date.now();
    const lastRecorded = lastRecordedRef.current.get(key);
    
    // Проверяем cooldown период
    if (lastRecorded && (now - lastRecorded) < config.cooldownTime) {
      console.log('⏰ Прослушивание уже записано недавно для NFT:', nft.metadata?.name);
      return false;
    }
    
    return true;
  }, [config.cooldownTime, getNftKey]);

  const markAsRecorded = useCallback((nft: NFT): void => {
    const key = getNftKey(nft);
    const now = Date.now();
    
    lastRecordedRef.current.set(key, now);
    recordedInSessionRef.current.add(key);
    
    console.log('✅ Прослушивание отмечено как записанное для NFT:', nft.metadata?.name);
  }, [getNftKey]);

  const shouldRecord = useCallback((nft: NFT, currentTime: number, duration: number): boolean => {
    // Базовые проверки
    if (!canRecord(nft)) {
      return false;
    }

    const key = getNftKey(nft);
    
    // Проверяем, не записывали ли уже в текущей сессии
    if (recordedInSessionRef.current.has(key)) {
      return false;
    }

    // Проверяем условия по времени и проценту прослушивания
    const listenThreshold = Math.min(config.minListenTime, duration * config.minListenPercentage);
    
    const shouldRecordByTime = currentTime >= listenThreshold;
    
    if (shouldRecordByTime) {
      console.log('⏰ Условие прослушивания выполнено:', {
        currentTime,
        duration,
        threshold: listenThreshold,
        trackName: nft.metadata?.name,
        nftAddress: nft.address,
        collectionAddress: nft.collection?.address
      });
      return true;
    }
    
    return false;
  }, [canRecord, getNftKey, config.minListenTime, config.minListenPercentage]);

  const clear = useCallback((): void => {
    lastRecordedRef.current.clear();
    recordedInSessionRef.current.clear();
    console.log('🧹 Трекер прослушиваний очищен');
  }, []);

  // Метод для сброса записи конкретного NFT (полезно при ошибках)
  const resetNft = useCallback((nft: NFT): void => {
    const key = getNftKey(nft);
    lastRecordedRef.current.delete(key);
    recordedInSessionRef.current.delete(key);
    console.log('🔄 Сброшена запись прослушивания для NFT:', nft.metadata?.name);
  }, [getNftKey]);

  // Получение статистики трекера
  const getStats = useCallback(() => {
    return {
      totalTracked: lastRecordedRef.current.size,
      recordedInSession: recordedInSessionRef.current.size,
      config
    };
  }, [config]);

  return {
    canRecord,
    markAsRecorded,
    shouldRecord,
    clear,
    resetNft,
    getStats
  };
}
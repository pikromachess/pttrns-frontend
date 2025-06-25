import { useRef, useCallback } from 'react';
import type { NFT } from '../types/nft';
import type { CacheEntry, CacheOptions, MusicCache } from '../types/cache';
import { 
  generateNftCacheKey, 
  isCacheExpired, 
  revokeBlobUrl, 
  sortCacheEntriesByAge,
  isValidNftForCache 
} from '../utils/cacheUtils';

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  maxSize: 50, // максимум 50 треков в кеше
  maxAge: 30 * 60 * 1000 // 30 минут
};

export function useMusicCache(options: CacheOptions = {}): MusicCache {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  // Очистка устаревших записей
  const cleanup = useCallback(() => {
    const cache = cacheRef.current;    
    const toDelete: string[] = [];

    cache.forEach((entry, key) => {
      if (isCacheExpired(entry.timestamp, config.maxAge)) {
        toDelete.push(key);
        revokeBlobUrl(entry.url);
      }
    });

    toDelete.forEach(key => cache.delete(key));
    
    console.log(`🧹 Очищено ${toDelete.length} устаревших записей из кеша`);
  }, [config.maxAge]);

  // Освобождение места в кеше при превышении лимита
  const evictOldEntries = useCallback(() => {
    const cache = cacheRef.current;
    
    if (cache.size <= config.maxSize) return;

    const entries = Array.from(cache.entries());
    const sortedEntries = sortCacheEntriesByAge(entries);
    
    // Удаляем самые старые записи
    const toEvict = sortedEntries.slice(0, cache.size - config.maxSize + 1);
    
    toEvict.forEach(([key, entry]) => {
      cache.delete(key);
      revokeBlobUrl(entry.url);
    });

    console.log(`🗑️ Удалено ${toEvict.length} старых записей из кеша`);
  }, [config.maxSize]);

  const get = useCallback((nft: NFT): string | null => {
    if (!isValidNftForCache(nft)) {
      console.warn('⚠️ Некорректный NFT для кеша:', nft);
      return null;
    }

    const key = generateNftCacheKey(nft);
    const entry = cacheRef.current.get(key);
    
    if (!entry) return null;
    
    // Проверяем, не истекла ли запись
    if (isCacheExpired(entry.timestamp, config.maxAge)) {
      cacheRef.current.delete(key);
      revokeBlobUrl(entry.url);
      console.log('⏰ Запись кеша истекла:', key);
      return null;
    }
    
    console.log('💾 Найден трек в кеше:', nft.metadata?.name);
    return entry.url;
  }, [config.maxAge]);

  const set = useCallback((nft: NFT, url: string): void => {
    if (!isValidNftForCache(nft)) {
      console.warn('⚠️ Некорректный NFT для кеша:', nft);
      return;
    }

    if (!url) {
      console.warn('⚠️ Пустой URL для кеша');
      return;
    }

    const key = generateNftCacheKey(nft);
    
    // Если запись уже существует, освобождаем старый URL
    const existingEntry = cacheRef.current.get(key);
    if (existingEntry) {
      revokeBlobUrl(existingEntry.url);
    }

    // Добавляем новую запись
    cacheRef.current.set(key, {
      url,
      timestamp: Date.now(),
      nftKey: key
    });

    console.log('💾 Трек добавлен в кеш:', nft.metadata?.name);

    // Проверяем лимиты и очищаем при необходимости
    evictOldEntries();
  }, [evictOldEntries]);

  const has = useCallback((nft: NFT): boolean => {
    if (!isValidNftForCache(nft)) return false;
    
    const key = generateNftCacheKey(nft);
    const entry = cacheRef.current.get(key);
    
    if (!entry) return false;
    
    // Проверяем актуальность
    if (isCacheExpired(entry.timestamp, config.maxAge)) {
      cacheRef.current.delete(key);
      revokeBlobUrl(entry.url);
      return false;
    }
    
    return true;
  }, [config.maxAge]);

  const deleteEntry = useCallback((nft: NFT): boolean => {
    if (!isValidNftForCache(nft)) return false;
    
    const key = generateNftCacheKey(nft);
    const entry = cacheRef.current.get(key);
    
    if (entry) {
      revokeBlobUrl(entry.url);
      cacheRef.current.delete(key);
      console.log('🗑️ Запись удалена из кеша:', key);
      return true;
    }
    
    return false;
  }, []);

  const clear = useCallback((): void => {
    const cache = cacheRef.current;
    
    // Освобождаем все blob URLs
    cache.forEach(entry => {
      revokeBlobUrl(entry.url);
    });
    
    cache.clear();
    console.log('🧹 Кеш полностью очищен');
  }, []);

  const size = useCallback((): number => {
    return cacheRef.current.size;
  }, []); 

  return {
    get,
    set,
    has,
    delete: deleteEntry,
    clear,
    size,
    cleanup
  };
}
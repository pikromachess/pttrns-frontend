import { useRef, useCallback } from 'react';
import { backendApi } from '../backend-api';
import type { ApiKeyCache, MusicApiKeyData } from '../types/cache';

export function useMusicApiKey() {
  const cacheRef = useRef<ApiKeyCache | null>(null);

  const isKeyValid = useCallback((cache: ApiKeyCache | null): boolean => {
    if (!cache) return false;
    return new Date() < cache.expiresAt;
  }, []);

  const getValidKey = useCallback(async (authToken: string): Promise<MusicApiKeyData | null> => {
    // Проверяем кеш
    if (isKeyValid(cacheRef.current)) {
      console.log('🔑 Используем кешированный API ключ');
      return {
        apiKey: cacheRef.current!.key,
        expiresAt: cacheRef.current!.expiresAt.toISOString(),
        musicServerUrl: cacheRef.current!.serverUrl
      };
    }

    // Получаем новый ключ
    try {
      console.log('🔑 Получение нового музыкального API ключа...');
      const keyData = await backendApi.generateMusicApiKey(authToken);
      
      if (!keyData) {
        console.error('❌ Не удалось получить музыкальный API ключ');
        return null;
      }

      // Кешируем ключ
      cacheRef.current = {
        key: keyData.apiKey,
        expiresAt: new Date(keyData.expiresAt),
        serverUrl: keyData.musicServerUrl
      };

      console.log('✅ Новый API ключ получен и закеширован');
      return keyData;
    } catch (error) {
      console.error('❌ Ошибка получения API ключа:', error);
      return null;
    }
  }, [isKeyValid]);

  const clearCache = useCallback(() => {
    cacheRef.current = null;
    console.log('🧹 Кеш API ключей очищен');
  }, []);

  const refreshKey = useCallback(async (authToken: string): Promise<MusicApiKeyData | null> => {
    clearCache();
    return getValidKey(authToken);
  }, [clearCache, getValidKey]);

  const getCachedKey = useCallback((): ApiKeyCache | null => {
    return isKeyValid(cacheRef.current) ? cacheRef.current : null;
  }, [isKeyValid]);

  return {
    getValidKey,
    refreshKey,
    clearCache,
    getCachedKey,
    isKeyValid: () => isKeyValid(cacheRef.current)
  };
}
import type { NFT } from '../types/nft';

/**
 * Генерирует уникальный ключ для NFT
 */
export function generateNftCacheKey(nft: NFT): string {
  return nft.address || `index-${nft.index || 0}`;
}

/**
 * Проверяет, истек ли кеш по времени
 */
export function isCacheExpired(timestamp: number, maxAge: number): boolean {
  return Date.now() - timestamp > maxAge;
}

/**
 * Очищает URL объекты для освобождения памяти
 */
export function revokeBlobUrl(url: string): void {
  try {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn('Ошибка при освобождении blob URL:', error);
  }
}

/**
 * Сортирует записи кеша по времени (старые первыми)
 */
export function sortCacheEntriesByAge<T extends { timestamp: number }>(
  entries: [string, T][]
): [string, T][] {
  return entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
}

/**
 * Валидирует, что NFT имеет необходимые данные для кеширования
 */
export function isValidNftForCache(nft: NFT): boolean {
  return !!(nft.address || (nft.index !== undefined && nft.index >= 0));
}
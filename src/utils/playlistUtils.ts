import type { NFT } from '../types/nft';

/**
 * Находит индекс NFT в плейлисте
 */
export function findNftIndex(playlist: NFT[], targetNft: NFT): number {
  return playlist.findIndex(nft => 
    nft.address === targetNft.address || 
    (nft.index === targetNft.index && !nft.address && !targetNft.address)
  );
}

/**
 * Создает упорядоченный плейлист начиная с выбранного трека
 */
export function createOrderedPlaylist(playlist: NFT[], startNft: NFT): NFT[] {
  const startIndex = findNftIndex(playlist, startNft);
  
  if (startIndex === -1) {
    return playlist;
  }
  
  return [
    ...playlist.slice(startIndex), // от выбранного до конца
    ...playlist.slice(0, startIndex) // от начала до выбранного
  ];
}

/**
 * Вычисляет следующий индекс в плейлисте (циклически)
 */
export function getNextIndex(currentIndex: number, playlistLength: number): number {
  if (playlistLength === 0) return -1;
  return (currentIndex + 1) % playlistLength;
}

/**
 * Вычисляет предыдущий индекс в плейлисте (циклически)
 */
export function getPreviousIndex(currentIndex: number, playlistLength: number): number {
  if (playlistLength === 0) return -1;
  return (currentIndex - 1 + playlistLength) % playlistLength;
}

/**
 * Обогащает NFT информацией о коллекции из другого NFT
 */
export function enrichNftWithCollection(nft: NFT, sourceNft: NFT): NFT {
  if (nft.collection?.address || !sourceNft.collection?.address) {
    return nft;
  }
  
  return {
    ...nft,
    collection: sourceNft.collection
  };
}

/**
 * Обогащает весь плейлист информацией о коллекции
 */
export function enrichPlaylistWithCollection(playlist: NFT[], referenceNft: NFT): NFT[] {
  if (!referenceNft.collection?.address) {
    return playlist;
  }
  
  return playlist.map(nft => enrichNftWithCollection(nft, referenceNft));
}

/**
 * Валидирует плейлист
 */
export function validatePlaylist(playlist: NFT[]): boolean {
  return Array.isArray(playlist) && playlist.length > 0;
}

/**
 * Проверяет, есть ли у всех NFT в плейлисте информация о коллекции
 */
export function hasCollectionInfo(playlist: NFT[]): boolean {
  return playlist.every(nft => nft.collection?.address);
}
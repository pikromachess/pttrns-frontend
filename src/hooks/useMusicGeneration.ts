import { useState, useCallback, useContext } from 'react';
import { usePlayer, generateMusicWithToken } from '../contexts/PlayerContext';
import { BackendTokenContext } from '../BackendTokenContext';
import type { NFT } from '../types/nft';

export function useMusicGeneration() {
  const { playNft } = usePlayer();
  const { token } = useContext(BackendTokenContext);
  const [generatingMusic, setGeneratingMusic] = useState<string | null>(null);

  const generateMusicForNft = useCallback(async (selectedNft: NFT, allNfts: NFT[]) => {
    if (!token) {
      console.error('❌ Отсутствует токен авторизации');
      alert('Необходима авторизация для воспроизведения музыки');
      return;
    }

    const nftId = selectedNft.address || `${selectedNft.index}`;
    
    // Проверяем, не генерируется ли уже музыка для этого NFT
    if (generatingMusic === nftId) {
      console.log('⏳ Музыка уже генерируется для этого NFT');
      return;
    }

    console.log('🎵 Начинаем генерацию музыки для NFT:', {
      name: selectedNft.metadata?.name,
      address: selectedNft.address,
      collectionAddress: selectedNft.collection?.address,
      playlistSize: allNfts.length
    });

    // Создаем копию выбранного NFT для избежания мутаций
    let nftToPlay = { ...selectedNft };

    // Проверяем, есть ли информация о коллекции
    if (!nftToPlay.collection?.address) {
      console.warn('⚠️ У NFT отсутствует информация о коллекции:', nftToPlay);
      // Пытаемся найти коллекцию в плейлисте
      const nftWithCollection = allNfts.find(n => 
        n.address === nftToPlay.address && n.collection?.address
      );
      if (nftWithCollection) {
        nftToPlay = { ...nftToPlay, collection: nftWithCollection.collection };
        console.log('🔧 Дополнили информацию о коллекции из плейлиста:', nftToPlay.collection?.address);
      } else {
        console.error('❌ Не удалось найти информацию о коллекции для NFT');
        alert('Ошибка: отсутствует информация о коллекции NFT');
        return;
      }
    }

    // Логируем финальные данные NFT перед воспроизведением
    console.log('🎯 Финальные данные NFT для генерации:', {
      name: nftToPlay.metadata?.name,
      address: nftToPlay.address,
      collectionName: nftToPlay.collection?.name,
      collectionAddress: nftToPlay.collection?.address
    });
    
    try {
      setGeneratingMusic(nftId);
      
      // Показываем индикатор загрузки пользователю
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      const audioUrl = await generateMusicWithToken(nftToPlay, token);
      console.log('🎼 Музыка сгенерирована, начинаем воспроизведение');
      
      // Убеждаемся, что все NFT в плейлисте имеют правильную информацию о коллекции
      const enrichedPlaylist = allNfts.map(playlistNft => {
        // Если у NFT в плейлисте нет коллекции, но мы знаем коллекцию из контекста
        if (!playlistNft.collection?.address && nftToPlay.collection?.address) {
          return {
            ...playlistNft,
            collection: nftToPlay.collection
          };
        }
        return playlistNft;
      });
      
      // Формируем плейлист: начиная с выбранного трека, затем все остальные в порядке
      const selectedIndex = enrichedPlaylist.findIndex(item => 
        item.address === nftToPlay.address || 
        (item.index === nftToPlay.index && !item.address && !nftToPlay.address)
      );
      
      let orderedPlaylist: NFT[];
      if (selectedIndex !== -1) {
        // Создаем плейлист начиная с выбранного трека
        orderedPlaylist = [
          ...enrichedPlaylist.slice(selectedIndex), // от выбранного до конца
          ...enrichedPlaylist.slice(0, selectedIndex) // от начала до выбранного
        ];
      } else {
        // Если трек не найден, просто используем весь список
        orderedPlaylist = enrichedPlaylist;
      }
      
      console.log('📋 Плейлист сформирован:', {
        selectedTrack: nftToPlay.metadata?.name,
        selectedIndex,
        totalTracks: orderedPlaylist.length,
        firstTrack: orderedPlaylist[0]?.metadata?.name,
        allTracksHaveCollection: orderedPlaylist.every(n => n.collection?.address),
        collectionAddress: nftToPlay.collection?.address
      });
      
      // Запускаем воспроизведение с правильным плейлистом
      await playNft({ ...nftToPlay, audioUrl }, orderedPlaylist);
      
    } catch (error) {
      console.error('❌ Ошибка генерации музыки:', error);
      alert('Ошибка при генерации музыки. Попробуйте еще раз.');
    } finally {
      setGeneratingMusic(null);
    }
  }, [token, playNft, generatingMusic]);

  const handleNftClick = useCallback((nft: NFT, allNfts: NFT[]) => {
    console.log('🎯 NFT clicked:', {
      track: nft.metadata?.name,
      hasToken: !!token,
      playlistSize: allNfts.length,
      hasCollectionInfo: !!nft.collection?.address,
      collectionAddress: nft.collection?.address
    });
    
    // Убеждаемся, что передаем полный список NFT для формирования плейлиста
    generateMusicForNft(nft, allNfts);
  }, [generateMusicForNft]);

  return {
    generatingMusic,
    generateMusicForNft,
    handleNftClick,
  };
}
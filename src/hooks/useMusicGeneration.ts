import { useState, useCallback, useContext } from 'react';
import { usePlayer, generateMusicWithToken } from '../contexts/PlayerContext';
import { BackendTokenContext } from '../BackendTokenContext';
import type { NFT } from '../types/nft';

export function useMusicGeneration() {
  const { playNft } = usePlayer();
  const { token } = useContext(BackendTokenContext);
  const [generatingMusic, setGeneratingMusic] = useState<string | null>(null);

  const generateMusicForNft = useCallback(async (nft: NFT, allNfts: NFT[]) => {
    if (!token) {
      console.error('Отсутствует токен авторизации');
      alert('Необходима авторизация для воспроизведения музыки');
      return;
    }

    const nftId = nft.address || `${nft.index}`;
    
    // Проверяем, не генерируется ли уже музыка для этого NFT
    if (generatingMusic === nftId) {
      console.log('Музыка уже генерируется для этого NFT');
      return;
    }
    
    try {
      setGeneratingMusic(nftId);
      console.log('Начинаем генерацию музыки для NFT:', nft.metadata?.name);
      console.log('Формируем плейлист из', allNfts.length, 'треков');
      
      // Показываем индикатор загрузки пользователю
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      const audioUrl = await generateMusicWithToken(nft, token);
      console.log('Музыка сгенерирована, начинаем воспроизведение');
      
      // Формируем плейлист: начиная с выбранного трека, затем все остальные в порядке
      const selectedIndex = allNfts.findIndex(item => 
        item.address === nft.address || 
        (item.index === nft.index && !item.address && !nft.address)
      );
      
      let orderedPlaylist: NFT[];
      if (selectedIndex !== -1) {
        // Создаем плейлист начиная с выбранного трека
        orderedPlaylist = [
          ...allNfts.slice(selectedIndex), // от выбранного до конца
          ...allNfts.slice(0, selectedIndex) // от начала до выбранного
        ];
      } else {
        // Если трек не найден, просто используем весь список
        orderedPlaylist = allNfts;
      }
      
      console.log('Плейлист сформирован:', {
        selectedTrack: nft.metadata?.name,
        selectedIndex,
        totalTracks: orderedPlaylist.length,
        firstTrack: orderedPlaylist[0]?.metadata?.name
      });
      
      // Запускаем воспроизведение с правильным плейлистом
      playNft({ ...nft, audioUrl }, orderedPlaylist);
      
    } catch (error) {
      console.error('Ошибка генерации музыки:', error);
      alert('Ошибка при генерации музыки. Попробуйте еще раз.');
    } finally {
      setGeneratingMusic(null);
    }
  }, [token, playNft, generatingMusic]);

  const handleNftClick = useCallback((nft: NFT, allNfts: NFT[]) => {
    console.log('NFT clicked:', {
      track: nft.metadata?.name,
      hasToken: !!token,
      playlistSize: allNfts.length
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
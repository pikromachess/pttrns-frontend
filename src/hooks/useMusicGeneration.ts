import { useState, useCallback } from 'react';
import { CHAIN, useTonConnectUI } from '@tonconnect/ui-react';
import { usePlayer } from '../contexts/PlayerContext';
import type { NFT } from '../types/nft';

// Кеш для сессионных токенов
let sessionCache: {
  sessionId: string;
  expiresAt: Date;
  musicServerUrl: string;
} | null = null;

export function useMusicGeneration() {
  const { playNft } = usePlayer();  
  const [tonConnectUI] = useTonConnectUI();
  const [generatingMusic, setGeneratingMusic] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Функция для получения ключа кеша NFT
  const getNftCacheKey = useCallback((nft: NFT): string => {
    return nft.address || `index-${nft.index}`;
  }, []);

  // Функция для создания сессии прослушивания
  const createListeningSession = useCallback(async (): Promise<{sessionId: string, musicServerUrl: string} | null> => {
    try {
      console.log('🔐 Создание сессии прослушивания...');
      
      // Проверяем кеш сессии
      if (sessionCache && new Date() < sessionCache.expiresAt) {
        console.log('✅ Используем кешированную сессию');
        return {
          sessionId: sessionCache.sessionId,
          musicServerUrl: sessionCache.musicServerUrl
        };
      }

      setIsCreatingSession(true);

      // Показываем пользователю информацию о том, что нужно подписать сообщение
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
      }

      // Подготавливаем данные для подписи
      const textData = {
        network: CHAIN.TESTNET, // или CHAIN.MAINNET в зависимости от вашей сети
        type: 'text' as const,
        text: "Подтвердите начало сессии прослушивания. Подписывая это сообщение, вы соглашаетесь с условиями честного использования NFT-аудио в рамках децентрализованной платформы. \nВаша подпись верифицируется в блокчейне и подтверждает легальное прослушивание токенизированного контента. \nСессия длится 1 час.\n\nPatternsNft"
      };

      console.log('📝 Запрос подписи сообщения...');
      
      // Запрашиваем подпись у пользователя
      const signResult = await tonConnectUI.signData(textData);

      if (!signResult) {
        console.warn('❌ Пользователь отклонил подпись');
        return null;
      }

      console.log('✅ Сообщение подписано, отправляем на бэкенд...');

      // Отправляем подписанные данные на бэкенд для создания сессии
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signature: signResult.signature,
          address: signResult.address,
          timestamp: signResult.timestamp,
          domain: signResult.domain,
          payload: signResult.payload          
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка создания сессии: ${response.status}`);
      }

      const sessionData = await response.json();
      
      // Кешируем сессию
      sessionCache = {
        sessionId: sessionData.sessionId,
        expiresAt: new Date(sessionData.expiresAt),
        musicServerUrl: sessionData.musicServerUrl
      };

      console.log('✅ Сессия создана успешно');
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      return {
        sessionId: sessionData.sessionId,
        musicServerUrl: sessionData.musicServerUrl
      };

    } catch (error) {
      console.error('❌ Ошибка создания сессии:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          // Пользователь отклонил подпись - не показываем ошибку
          return null;
        } else if (error.message.includes('Подпись устарела')) {
          alert('Подпись устарела. Попробуйте еще раз.');
        } else if (error.message.includes('Неверная подпись')) {
          alert('Ошибка проверки подписи. Попробуйте еще раз.');
        } else {
          alert(`Ошибка создания сессии: ${error.message}`);
        }
      } else {
        alert('Неизвестная ошибка при создании сессии');
      }
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
      
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }, [tonConnectUI]);

  // Функция для генерации музыки с сессионным токеном
  const generateMusicWithSession = useCallback(async (nft: NFT, sessionId: string, musicServerUrl: string): Promise<string> => {
    console.log('🎵 Генерация музыки через сессию...');
    
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
        // Сессия истекла, очищаем кеш
        sessionCache = null;
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
  }, []);

  // Основная функция генерации музыки
  const generateMusicForNft = useCallback(async (selectedNft: NFT, allNfts: NFT[]) => {
    const nftId = selectedNft.address || `${selectedNft.index}`;
    
    // Проверяем, не генерируется ли уже музыка для этого NFT
    if (generatingMusic === nftId || isCreatingSession) {
      return;
    }

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
      } else {
        console.error('❌ Не удалось найти информацию о коллекции для NFT');
        alert('Ошибка: отсутствует информация о коллекции NFT');
        return;
      }
    }
    
    try {
      setGeneratingMusic(nftId);
      
      // Показываем индикатор загрузки пользователю
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      // Создаем сессию прослушивания
      const sessionData = await createListeningSession();
      if (!sessionData) {
        // Пользователь отклонил подпись или произошла ошибка
        return;
      }

      // Генерируем музыку с сессионным токеном
      const audioUrl = await generateMusicWithSession(nftToPlay, sessionData.sessionId, sessionData.musicServerUrl);
      
      // Добавляем сессионные данные в NFT для дальнейшего использования
      const enrichedNft = {
        ...nftToPlay,
        audioUrl,
        sessionId: sessionData.sessionId,
        musicServerUrl: sessionData.musicServerUrl
      };
      
      // Убеждаемся, что все NFT в плейлисте имеют правильную информацию о коллекции
      const enrichedPlaylist = allNfts.map(playlistNft => {
        // Если у NFT в плейлисте нет коллекции, но мы знаем коллекцию из контекста
        if (!playlistNft.collection?.address && nftToPlay.collection?.address) {
          return {
            ...playlistNft,
            collection: nftToPlay.collection,
            sessionId: sessionData.sessionId,
            musicServerUrl: sessionData.musicServerUrl
          };
        }
        return {
          ...playlistNft,
          sessionId: sessionData.sessionId,
          musicServerUrl: sessionData.musicServerUrl
        };
      });
      
      // Формируем плейлист: начиная с выбранного трека
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
      
      // Запускаем воспроизведение с правильным плейлистом
      await playNft(enrichedNft, orderedPlaylist);
      
    } catch (error) {
      console.error('❌ Ошибка генерации музыки:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Сессия истекла')) {
          // Очищаем кеш и пробуем еще раз
          sessionCache = null;
          alert('Сессия истекла. Попробуйте еще раз.');
        } else {
          alert(`Ошибка при генерации музыки: ${error.message}`);
        }
      } else {
        alert('Неизвестная ошибка при генерации музыки');
      }
    } finally {
      setGeneratingMusic(null);
    }
  }, [createListeningSession, generateMusicWithSession, playNft, generatingMusic, isCreatingSession, getNftCacheKey]);

  const handleNftClick = useCallback((nft: NFT, allNfts: NFT[]) => {
    generateMusicForNft(nft, allNfts);
  }, [generateMusicForNft]);

  return {
    generatingMusic: generatingMusic || (isCreatingSession ? 'session-creation' : null),
    generateMusicForNft,
    handleNftClick,
    isCreatingSession,
  };
}
// В src/hooks/useMusicGeneration.ts

import { useState, useCallback } from 'react';
import { CHAIN, useTonConnectUI } from '@tonconnect/ui-react';
import { usePlayer } from '../contexts/PlayerContext';
import type { NFT } from '../types/nft';
import { baseUrl } from '../backend-api';
import { 
  logSessionRequest, 
  logBackendResponse, 
  logMusicRequest,
  createDetailedErrorMessage,
  validateSessionData,
  validateTimestamp,
  safeParseJson
} from '../utils/debugUtils';

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

      console.log('✅ Сообщение подписано, проверяем данные...');

      // Валидируем полученные данные
      const validation = validateSessionData(signResult);
      if (!validation.isValid) {
        throw new Error(`Некорректные данные подписи: ${validation.errors.join(', ')}`);
      }

      // Проверяем временную метку
      const timestampValidation = validateTimestamp(signResult.timestamp);
      if (!timestampValidation.isValid) {
        throw new Error(timestampValidation.message || 'Некорректная временная метка');
      }

      // Логируем детали запроса
      logSessionRequest(signResult);

      // Отправляем подписанные данные на бэкенд для создания сессии
      // Используем только поля, которые есть в SignDataResponse
      const requestBody = {
        signature: signResult.signature,
        address: signResult.address,
        timestamp: signResult.timestamp,
        domain: signResult.domain,
        payload: signResult.payload,
        // Убираем поля, которых нет в официальном API
        // public_key и walletStateInit будут получены на бэкенде другим способом
      };

      console.log('📡 Отправляем данные на создание сессии:', {
        address: requestBody.address,
        domain: requestBody.domain,
        timestamp: requestBody.timestamp,
        hasSignature: !!requestBody.signature,
        payloadType: requestBody.payload.type
      });

      const response = await fetch(`${baseUrl}/api/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      logBackendResponse(response, responseText);

      if (!response.ok) {
        const parseResult = safeParseJson(responseText);
        const errorMessage = parseResult.success 
          ? parseResult.data?.error || `Ошибка HTTP ${response.status}`
          : `Ошибка сервера: ${response.status} - ${responseText}`;
        
        throw new Error(errorMessage);
      }

      const parseResult = safeParseJson(responseText);
      if (!parseResult.success) {
        throw new Error(`Ошибка парсинга ответа: ${parseResult.error}`);
      }

      const sessionData = parseResult.data;
      
      console.log('✅ Сессия создана успешно:', {
        sessionId: sessionData.sessionId.slice(0, 20) + '...',
        musicServerUrl: sessionData.musicServerUrl,
        expiresAt: sessionData.expiresAt
      });
      
      // Кешируем сессию
      sessionCache = {
        sessionId: sessionData.sessionId,
        expiresAt: new Date(sessionData.expiresAt),
        musicServerUrl: sessionData.musicServerUrl
      };
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      return {
        sessionId: sessionData.sessionId,
        musicServerUrl: sessionData.musicServerUrl
      };

    } catch (error) {
      console.error('❌ Ошибка создания сессии:', error);
      
      const detailedError = createDetailedErrorMessage(error, 'createListeningSession');
      console.error('📋 Детальная ошибка:', detailedError);
      
      // Показываем ошибку только если это не отказ пользователя от подписи
      if (detailedError.code !== 'USER_REJECTED') {
        alert(detailedError.message);
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
    // Логируем детали запроса
    logMusicRequest(nft, sessionId, musicServerUrl);
    
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

    const responseText = await response.text();
    
    console.log('📡 Ответ от музыкального сервера:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      responseLength: responseText.length,
      isAudio: response.headers.get('content-type')?.includes('audio') || false
    });

    if (!response.ok) {
      console.error('❌ Ошибка от музыкального сервера:', responseText);
      
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
      
      throw new Error(`Ошибка сервера: ${response.status} - ${responseText}`);
    }

    // Для аудио ответа читаем как blob
    const audioBlob = new Blob([responseText], { type: response.headers.get('content-type') || 'audio/wav' });
    console.log('✅ Музыка сгенерирована успешно, размер:', audioBlob.size);
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
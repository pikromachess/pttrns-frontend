import { useState, useCallback } from 'react';
import { CHAIN, useTonConnectUI } from '@tonconnect/ui-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../components/Toast/Toast';
import type { NFT } from '../types/nft';
import { baseUrl } from '../backend-api';
import { 
  logSessionRequest, 
  logBackendResponse,   
  createDetailedErrorMessage,
  validateSessionData,
  validateTimestamp,
  safeParseJson
} from '../utils/debugUtils';

// Убираем локальный кеш - теперь используем глобальный контекст

export function useMusicGeneration() {
  const { playNft } = usePlayer();  
  const [tonConnectUI] = useTonConnectUI();
  const { showToast } = useToast();
  const { 
    hasActiveSession, 
    sessionId, 
    musicServerUrl, 
    setSessionData, 
    clearSession,
    checkSessionValidity 
  } = useSession();
  const [generatingMusic, setGeneratingMusic] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [pendingNft, setPendingNft] = useState<{nft: NFT, allNfts: NFT[]} | null>(null);

  // Функция для получения ключа кеша NFT
  const getNftCacheKey = useCallback((nft: NFT): string => {
    return nft.address || `index-${nft.index}`;
  }, []);

  // Проверяем, есть ли активная сессия
  const hasValidSession = useCallback((): boolean => {
    return checkSessionValidity();
  }, [checkSessionValidity]);

  // Функция для создания сессии прослушивания
  const createListeningSession = useCallback(async (): Promise<{sessionId: string, musicServerUrl: string} | null> => {
    try {
      console.log('🔐 Создание сессии прослушивания...');
      
      // Проверяем кеш сессии через контекст
      if (hasActiveSession && sessionId && musicServerUrl) {
        console.log('✅ Используем кешированную сессию из контекста');
        return {
          sessionId,
          musicServerUrl
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
      const requestBody = {
        signature: signResult.signature,
        address: signResult.address,
        timestamp: signResult.timestamp,
        domain: signResult.domain,
        payload: signResult.payload,
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

      const sessionDataResponse = parseResult.data;
      
      console.log('✅ Сессия создана успешно:', {
        sessionId: sessionDataResponse.sessionId.slice(0, 20) + '...',
        musicServerUrl: sessionDataResponse.musicServerUrl,
        expiresAt: sessionDataResponse.expiresAt
      });
      
      // Сохраняем в глобальный контекст
      setSessionData(
        sessionDataResponse.sessionId,
        sessionDataResponse.musicServerUrl,
        new Date(sessionDataResponse.expiresAt)
      );
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      return {
        sessionId: sessionDataResponse.sessionId,
        musicServerUrl: sessionDataResponse.musicServerUrl
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
  }, [tonConnectUI, hasActiveSession, sessionId, musicServerUrl, setSessionData]);

  // Функция для обработки подтверждения создания сессии
  const handleSessionWarningConfirm = useCallback(async () => {
    setShowSessionWarning(false);
    
    if (!pendingNft) return;
    
    try {
      // Создаем сессию
      const sessionData = await createListeningSession();
      
      if (sessionData) {
        // Сессия создана успешно, но НЕ запускаем воспроизведение автоматически
        console.log('✅ Сессия создана. Для воспроизведения нажмите на трек еще раз.');
        
        // Показываем уведомление пользователю
        showToast('Сессия создана! Теперь можно воспроизводить музыку', 'success', 4000);
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при создании сессии:', error);
    } finally {
      setPendingNft(null);
    }
  }, [pendingNft, createListeningSession]);

  // Функция для обработки отмены создания сессии
  const handleSessionWarningCancel = useCallback(() => {
    setShowSessionWarning(false);
    setPendingNft(null);
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  }, []);

  // Основная функция генерации музыки
  const generateMusicForNft = useCallback(async (selectedNft: NFT, allNfts: NFT[]) => {
    const nftId = selectedNft.address || `${selectedNft.index}`;
    
    // Проверяем, не генерируется ли уже музыка для этого NFT
    if (generatingMusic === nftId || isCreatingSession) {
      return;
    }

    // Проверяем, есть ли активная сессия
    if (!hasValidSession()) {
      console.log('🔐 Нет активной сессии, показываем предупреждение');
      
      // Сохраняем информацию о треке для последующего воспроизведения
      setPendingNft({ nft: selectedNft, allNfts });
      setShowSessionWarning(true);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
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
      
      // Используем существующую сессию из контекста
      if (!sessionId || !musicServerUrl) {
        throw new Error('Сессия недоступна');
      }

      const sessionDataToUse = {
        sessionId,
        musicServerUrl
      };

      // ИСПРАВЛЕНО: Обогащаем ВСЕ NFT в плейлисте сессионными данными
      const enrichedPlaylist = allNfts.map(playlistNft => ({
        ...playlistNft,
        sessionId: sessionDataToUse.sessionId,
        musicServerUrl: sessionDataToUse.musicServerUrl,
        // Если у NFT в плейлисте нет коллекции, но мы знаем коллекцию из контекста
        collection: playlistNft.collection?.address 
          ? playlistNft.collection 
          : (nftToPlay.collection?.address ? nftToPlay.collection : playlistNft.collection)
      }));
      
      // Обогащаем выбранный NFT
      const enrichedNft = {
        ...nftToPlay,
        sessionId: sessionDataToUse.sessionId,
        musicServerUrl: sessionDataToUse.musicServerUrl
      };
      
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
      
      console.log('🎵 Запускаем воспроизведение с сессионными данными:', {
        selectedNft: enrichedNft.metadata?.name,
        sessionId: sessionDataToUse.sessionId.slice(0, 20) + '...',
        playlistLength: orderedPlaylist.length,
        playlistWithSession: orderedPlaylist.every(nft => nft.sessionId && nft.musicServerUrl)
      });
      
      // Запускаем воспроизведение с правильным плейлистом
      await playNft(enrichedNft, orderedPlaylist);
      
    } catch (error) {
      console.error('❌ Ошибка генерации музыки:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Сессия истекла')) {
          // Очищаем сессию и показываем предупреждение снова
          clearSession();
          setPendingNft({ nft: selectedNft, allNfts });
          setShowSessionWarning(true);
        } else if (error.message.includes('401') || error.message.includes('Authentication required')) {
          // Проблема с аутентификацией
          clearSession();
          alert('Ошибка аутентификации. Пожалуйста, создайте сессию заново.');
        } else if (error.message.includes('503') || error.message.includes('недоступен')) {
          alert('Сервис генерации музыки временно недоступен. Попробуйте позже.');
        } else {
          alert(`Ошибка при генерации музыки: ${error.message}`);
        }
      } else {
        alert('Неизвестная ошибка при генерации музыки');
      }
    } finally {
      setGeneratingMusic(null);
    }
  }, [playNft, generatingMusic, isCreatingSession, getNftCacheKey, hasValidSession, sessionId, musicServerUrl, clearSession]);

  const handleNftClick = useCallback((nft: NFT, allNfts: NFT[]) => {
    generateMusicForNft(nft, allNfts);
  }, [generateMusicForNft]);

  return {
    generatingMusic: generatingMusic || (isCreatingSession ? 'session-creation' : null),
    generateMusicForNft,
    handleNftClick,
    isCreatingSession,
    showSessionWarning,
    handleSessionWarningConfirm,
    handleSessionWarningCancel,
    hasActiveSession,
    showToast, // Экспортируем для использования в компонентах
  };
}
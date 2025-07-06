// В src/utils/debugUtils.ts

import type { SessionError } from '../types/session';

/**
 * Логирует детали запроса создания сессии
 */
export function logSessionRequest(signData: any): void {
  console.log('🔐 Детали запроса создания сессии:', {
    hasSignature: !!signData.signature,
    signatureLength: signData.signature?.length || 0,
    address: signData.address,
    domain: signData.domain,
    timestamp: signData.timestamp,
    timestampDate: signData.timestamp ? new Date(signData.timestamp * 1000).toISOString() : null,
    timeDiff: signData.timestamp ? Math.floor(Date.now() / 1000) - signData.timestamp : null,
    payloadType: signData.payload?.type,
    payloadTextLength: signData.payload?.text?.length || 0,
    payloadPreview: signData.payload?.text?.slice(0, 50) + '...' || 'нет текста'
  });
}

/**
 * Логирует ответ от бэкенда
 */
export function logBackendResponse(response: Response, responseText: string): void {
  console.log('📡 Ответ от бэкенда:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    },
    responseLength: responseText.length,
    responsePreview: responseText.slice(0, 200) + (responseText.length > 200 ? '...' : '')
  });
}

/**
 * Логирует детали музыкального запроса
 */
export function logMusicRequest(nft: any, sessionId: string, musicServerUrl: string): void {
  console.log('🎵 Детали запроса к музыкальному серверу:', {
    nftAddress: nft.address,
    nftIndex: nft.index,
    nftName: nft.metadata?.name,
    collectionAddress: nft.collection?.address,
    collectionName: nft.collection?.name,
    sessionIdPreview: sessionId.slice(0, 20) + '...',
    musicServerUrl,
    requestBody: {
      metadata: !!nft.metadata,
      metadataKeys: nft.metadata ? Object.keys(nft.metadata) : [],
      index: nft.index,
      address: nft.address
    }
  });
}

/**
 * Создает детальное сообщение об ошибке
 */
export function createDetailedErrorMessage(error: any, context: string): SessionError {
  let errorCode = 'UNKNOWN_ERROR';
  let errorMessage = 'Неизвестная ошибка';
  let errorDetails = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';

    // Определяем тип ошибки
    if (error.message.includes('User rejected')) {
      errorCode = 'USER_REJECTED';
      errorMessage = 'Пользователь отклонил подпись';
    } else if (error.message.includes('Подпись устарела')) {
      errorCode = 'SIGNATURE_EXPIRED';
      errorMessage = 'Подпись устарела';
    } else if (error.message.includes('Неверная подпись')) {
      errorCode = 'INVALID_SIGNATURE';
      errorMessage = 'Неверная подпись';
    } else if (error.message.includes('Сессия истекла')) {
      errorCode = 'SESSION_EXPIRED';
      errorMessage = 'Сессия истекла';
    } else if (error.message.includes('401')) {
      errorCode = 'UNAUTHORIZED';
      errorMessage = 'Ошибка авторизации';
    } else if (error.message.includes('403')) {
      errorCode = 'FORBIDDEN';
      errorMessage = 'Доступ запрещен';
    } else if (error.message.includes('429')) {
      errorCode = 'RATE_LIMITED';
      errorMessage = 'Превышен лимит запросов';
    } else if (error.message.includes('503')) {
      errorCode = 'SERVICE_UNAVAILABLE';
      errorMessage = 'Сервис недоступен';
    }
  }

  return {
    code: errorCode,
    message: errorMessage,
    details: `${context}: ${errorDetails}`
  };
}

/**
 * Валидирует данные для создания сессии
 */
export function validateSessionData(signData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!signData) {
    errors.push('Отсутствуют данные подписи');
    return { isValid: false, errors };
  }

  if (!signData.signature) {
    errors.push('Отсутствует подпись');
  } else if (typeof signData.signature !== 'string') {
    errors.push('Подпись должна быть строкой');
  } else if (signData.signature.length === 0) {
    errors.push('Пустая подпись');
  }

  if (!signData.address) {
    errors.push('Отсутствует адрес');
  } else if (typeof signData.address !== 'string') {
    errors.push('Адрес должен быть строкой');
  }

  if (!signData.timestamp) {
    errors.push('Отсутствует временная метка');
  } else if (typeof signData.timestamp !== 'number') {
    errors.push('Временная метка должна быть числом');
  } else if (signData.timestamp <= 0) {
    errors.push('Некорректная временная метка');
  }

  if (!signData.domain) {
    errors.push('Отсутствует домен');
  } else if (typeof signData.domain !== 'string') {
    errors.push('Домен должен быть строкой');
  }

  if (!signData.payload) {
    errors.push('Отсутствует payload');
  } else {
    if (signData.payload.type !== 'text') {
      errors.push('Тип payload должен быть "text"');
    }
    if (!signData.payload.text) {
      errors.push('Отсутствует текст в payload');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Проверяет соответствие времени
 */
export function validateTimestamp(timestamp: number, maxAgeMinutes: number = 5): { isValid: boolean; message?: string } {
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;

  if (age < 0) {
    return { isValid: false, message: 'Временная метка из будущего' };
  }

  if (age > maxAgeMinutes * 60) {
    return { isValid: false, message: `Временная метка устарела (возраст: ${Math.floor(age / 60)} минут)` };
  }

  return { isValid: true };
}

/**
 * Форматирует время для логов
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Безопасно парсит JSON ответ
 */
export function safeParseJson(text: string): { success: boolean; data?: any; error?: string } {
  try {
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ошибка парсинга JSON' 
    };
  }
}
// src/services/musicGenerationService.ts
import type { NFT } from '../types/nft';
import type { MusicGenerationRequest, MusicGenerationOptions, MusicApiKeyData } from '../types/musicApi';

export class MusicGenerationService {
  private apiKeyCache: {
    key: string;
    expiresAt: Date;
    serverUrl: string;
  } | null = null;

  /**
   * Генерирует музыку для NFT
   */
  async generateMusic(
    nft: NFT, 
    getApiKey: () => Promise<MusicApiKeyData | null>,
    options: Partial<MusicGenerationOptions> = {}
  ): Promise<string> {
    const config: MusicGenerationOptions = {
      retryOnAuthError: true,
      timeout: 30000,
      ...options
    };

    try {
      console.log('🎼 Начинаем генерацию музыки для NFT:', nft.metadata?.name);

      const apiKeyData = await getApiKey();
      if (!apiKeyData) {
        throw new Error('Не удалось получить API ключ для генерации музыки');
      }

      const audioBlob = await this.makeGenerationRequest(nft, apiKeyData, config);
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('✅ Музыка успешно сгенерирована для NFT:', nft.metadata?.name);
      return audioUrl;

    } catch (error) {
      console.error('❌ Ошибка генерации музыки:', error);
      throw error;
    }
  }

  /**
   * Выполняет запрос на генерацию музыки
   */
  private async makeGenerationRequest(
    nft: NFT, 
    apiKeyData: MusicApiKeyData, 
    config: MusicGenerationOptions
  ): Promise<Blob> {
    const request: MusicGenerationRequest = {
      metadata: nft.metadata,
      index: nft.index
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(`${apiKeyData.musicServerUrl}/generate-music-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Music-Api-Key': apiKeyData.apiKey,
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleResponseError(response, config);
      }

      return await response.blob();

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Превышено время ожидания генерации музыки');
      }
      
      throw error;
    }
  }

  /**
   * Обрабатывает ошибки ответа от сервера
   */
  private async handleResponseError(
    response: Response, 
    config: MusicGenerationOptions
  ): Promise<never> {
    switch (response.status) {
      case 401:
        if (config.retryOnAuthError) {
          throw new Error('AUTH_EXPIRED'); // Специальный тип ошибки для повторной попытки
        }
        throw new Error('Ошибка авторизации при генерации музыки');
      
      case 403:
        throw new Error('Нет доступа к генерации музыки');
      
      case 429:
        throw new Error('Слишком много запросов. Попробуйте позже');
      
      case 503:
        throw new Error('Сервис генерации музыки временно недоступен');
      
      default:
        const errorText = await response.text().catch(() => 'Неизвестная ошибка');
        throw new Error(`Ошибка сервера (${response.status}): ${errorText}`);
    }
  }

  /**
   * Генерирует музыку с автоматическим обновлением ключа при необходимости
   */
  async generateMusicWithRetry(
    nft: NFT,
    getApiKey: () => Promise<MusicApiKeyData | null>,
    refreshApiKey: () => Promise<MusicApiKeyData | null>,
    options: Partial<MusicGenerationOptions> = {}
  ): Promise<string> {
    try {
      return await this.generateMusic(nft, getApiKey, options);
    } catch (error) {
      // Если ошибка связана с истечением ключа, пробуем обновить
      if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
        console.log('🔑 API ключ истек, получаем новый...');
        
        try {
          const newApiKeyData = await refreshApiKey();
          if (!newApiKeyData) {
            throw new Error('Не удалось обновить API ключ');
          }

          // Повторная попытка с новым ключом
          return await this.generateMusic(nft, () => Promise.resolve(newApiKeyData), {
            ...options,
            retryOnAuthError: false // Не повторяем при ошибке авторизации
          });
        } catch (refreshError) {
          console.error('❌ Ошибка обновления API ключа:', refreshError);
          throw new Error('Не удалось обновить ключ доступа к музыкальному сервису');
        }
      }

      throw error;
    }
  }

  /**
   * Предварительная генерация музыки (для предзагрузки)
   */
  async preloadMusic(
    nft: NFT,
    getApiKey: () => Promise<MusicApiKeyData | null>,
    onSuccess?: (url: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      console.log('⏳ Предзагрузка музыки для:', nft.metadata?.name);
      
      const url = await this.generateMusic(nft, getApiKey, {
        timeout: 45000 // Увеличенный таймаут для предзагрузки
      });
      
      onSuccess?.(url);
      console.log('✅ Предзагрузка завершена для:', nft.metadata?.name);
    } catch (error) {
      console.error('❌ Ошибка предзагрузки для:', nft.metadata?.name, error);
      onError?.(error instanceof Error ? error : new Error('Неизвестная ошибка предзагрузки'));
    }
  }

  /**
   * Пакетная генерация музыки для списка NFT
   */
  async generateBatch(
    nfts: NFT[],
    getApiKey: () => Promise<MusicApiKeyData | null>,
    onProgress?: (completed: number, total: number, currentNft: NFT) => void,
    onError?: (nft: NFT, error: Error) => void,
    concurrency: number = 2
  ): Promise<Map<string, string>> {
    console.log(`🎼 Начинаем пакетную генерацию для ${nfts.length} NFT`);
    
    const results = new Map<string, string>();
    const errors: Array<{ nft: NFT; error: Error }> = [];
    
    // Разбиваем на батчи для контроля конкурентности
    for (let i = 0; i < nfts.length; i += concurrency) {
      const batch = nfts.slice(i, i + concurrency);
      
      const promises = batch.map(async (nft) => {
        try {
          const url = await this.generateMusic(nft, getApiKey);
          const key = nft.address || `index-${nft.index}`;
          results.set(key, url);
          
          onProgress?.(results.size, nfts.length, nft);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Неизвестная ошибка');
          errors.push({ nft, error: err });
          onError?.(nft, err);
        }
      });
      
      await Promise.all(promises);
    }
    
    console.log(`✅ Пакетная генерация завершена: ${results.size} успешно, ${errors.length} ошибок`);
    return results;
  }

  /**
   * Очистка ресурсов сервиса
   */
  cleanup(): void {
    this.apiKeyCache = null;
    console.log('🧹 Сервис генерации музыки очищен');
  }
}

// Экспортируем singleton экземпляр
export const musicGenerationService = new MusicGenerationService();
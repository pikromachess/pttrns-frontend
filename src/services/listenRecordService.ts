import { backendApi } from '../backend-api';
import type { NFT } from '../types/nft';
import type { ListenRecord } from '../types/musicApi';

interface RecordListenOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<RecordListenOptions> = {
  retryAttempts: 3,
  retryDelay: 1000, // 1 секунда
  timeout: 5000 // 5 секунд
};

export class ListenRecordService {
  private recordQueue: ListenRecord[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startQueueProcessor();
  }

  /**
   * Записывает прослушивание NFT
   */
  async recordListen(
    nft: NFT, 
    options: Partial<RecordListenOptions> = {}
  ): Promise<boolean> {
    const config = { ...DEFAULT_OPTIONS, ...options };

    if (!this.validateNft(nft)) {
      console.warn('❌ Недостаточно данных для записи прослушивания:', {
        hasAddress: !!nft.address,
        hasCollectionAddress: !!nft.collection?.address
      });
      return false;
    }

    console.log('🎵 Записываем прослушивание для NFT:', {
      name: nft.metadata?.name,
      address: nft.address,
      collectionAddress: nft.collection?.address
    });

    try {
      const success = await this.makeRecordRequest(nft, config);
      
      if (success) {
        console.log('✅ Прослушивание успешно записано для NFT:', nft.metadata?.name);
      } else {
        console.error('❌ Сервер вернул false при записи прослушивания');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Ошибка при записи прослушивания:', error);
      
      // Добавляем в очередь для повторной попытки
      this.addToQueue({
        nftAddress: nft.address!,
        collectionAddress: nft.collection!.address!,
        timestamp: Date.now()
      });
      
      return false;
    }
  }

  /**
   * Валидирует NFT для записи прослушивания
   */
  private validateNft(nft: NFT): boolean {
    return !!(nft.address && nft.collection?.address);
  }

  /**
   * Выполняет запрос на запись прослушивания
   */
  private async makeRecordRequest(
    nft: NFT, 
    config: Required<RecordListenOptions>
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        console.log(`📤 Попытка ${attempt}/${config.retryAttempts} записи прослушивания`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const success = await backendApi.recordListen(
          nft.address!,
          nft.collection!.address!
        );

        clearTimeout(timeoutId);
        return success;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Неизвестная ошибка');
        console.warn(`⚠️ Попытка ${attempt} неудачна:`, lastError.message);

        if (attempt < config.retryAttempts) {
          await this.delay(config.retryDelay * attempt); // Экспоненциальная задержка
        }
      }
    }

    throw lastError || new Error('Все попытки записи прослушивания неудачны');
  }

  /**
   * Добавляет запись в очередь для повторной обработки
   */
  private addToQueue(record: ListenRecord): void {
    // Проверяем, нет ли уже такой записи в очереди
    const exists = this.recordQueue.some(
      r => r.nftAddress === record.nftAddress && 
           r.collectionAddress === record.collectionAddress
    );

    if (!exists) {
      this.recordQueue.push(record);
      console.log('📋 Добавлена запись в очередь:', record.nftAddress);
    }
  }

  /**
   * Запускает обработчик очереди
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 30000); // Обрабатываем очередь каждые 30 секунд
  }

  /**
   * Останавливает обработчик очереди
   */
  private stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Обрабатывает очередь записей
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.recordQueue.length === 0) return;

    this.isProcessing = true;
    console.log(`📋 Обрабатываем очередь: ${this.recordQueue.length} записей`);

    const toProcess = [...this.recordQueue];
    this.recordQueue = [];

    for (const record of toProcess) {
      try {
        const success = await backendApi.recordListen(
          record.nftAddress,
          record.collectionAddress
        );

        if (success) {
          console.log('✅ Запись из очереди успешно обработана:', record.nftAddress);
        } else {
          // Возвращаем в очередь, если не слишком старая
          if (Date.now() - record.timestamp < 300000) { // 5 минут
            this.recordQueue.push(record);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка обработки записи из очереди:', error);
        
        // Возвращаем в очередь, если не слишком старая
        if (Date.now() - record.timestamp < 300000) { // 5 минут
          this.recordQueue.push(record);
        }
      }

      // Небольшая задержка между запросами
      await this.delay(100);
    }

    this.isProcessing = false;
  }

  /**
   * Пакетная запись прослушиваний
   */
  async recordBatch(records: Array<{ nft: NFT; timestamp?: number }>): Promise<number> {
    console.log(`📊 Пакетная запись ${records.length} прослушиваний`);
    
    let successCount = 0;

    for (const { nft } of records) {
      try {
        const success = await this.recordListen(nft, { retryAttempts: 1 });
        if (success) successCount++;
      } catch (error) {
        console.error('❌ Ошибка в пакетной записи:', error);
      }

      // Небольшая задержка между запросами
      await this.delay(200);
    }

    console.log(`✅ Пакетная запись завершена: ${successCount}/${records.length} успешно`);
    return successCount;
  }

  /**
   * Получение статистики сервиса
   */
  getStats() {
    return {
      queueSize: this.recordQueue.length,
      isProcessing: this.isProcessing,
      hasProcessor: !!this.processingInterval
    };
  }

  /**
   * Очистка очереди и остановка обработки
   */
  cleanup(): void {
    this.stopQueueProcessor();
    this.recordQueue = [];
    this.isProcessing = false;
    console.log('🧹 Сервис записи прослушиваний очищен');
  }

  /**
   * Форсированная обработка очереди
   */
  async flushQueue(): Promise<void> {
    console.log('🚀 Форсированная обработка очереди');
    await this.processQueue();
  }

  /**
   * Вспомогательная функция задержки
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Экспортируем singleton экземпляр
export const listenRecordService = new ListenRecordService();
import { useRef, useCallback, useEffect } from 'react';
import { calculateProgress } from '../utils/audioUtils';

interface UseProgressTimerOptions {
  onTimeUpdate?: (currentTime: number, duration: number, progress: number) => void;
  onTrackEnd?: () => void;
  onListenThresholdReached?: (currentTime: number, duration: number) => void;
  updateInterval?: number; // интервал обновления в миллисекундах
  listenThreshold?: (duration: number) => number; // функция для расчета порога прослушивания
}

const DEFAULT_OPTIONS: Required<UseProgressTimerOptions> = {
  onTimeUpdate: () => {},
  onTrackEnd: () => {},
  onListenThresholdReached: () => {},
  updateInterval: 1000, // 1 секунда
  listenThreshold: (duration) => Math.min(30, duration * 0.8) // 30 сек или 80% трека
};

export function useProgressTimer(options: UseProgressTimerOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(180);
  const listenThresholdReachedRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  const start = useCallback((audioElement?: HTMLAudioElement | null) => {
    cleanup(); // Очищаем предыдущий таймер
    
    audioElementRef.current = audioElement || null;
    isRunningRef.current = true;
    listenThresholdReachedRef.current = false;

    console.log('⏱️ Запуск таймера прогресса');

    intervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;

      let currentTime: number;
      let duration: number;

      if (audioElementRef.current) {
        // Режим с аудио элементом
        currentTime = audioElementRef.current.currentTime;
        duration = audioElementRef.current.duration || durationRef.current;
        
        // Обновляем внутренние ссылки
        currentTimeRef.current = currentTime;
        durationRef.current = duration;
      } else {
        // Fallback режим без аудио элемента
        currentTime = currentTimeRef.current + (config.updateInterval / 1000);
        duration = durationRef.current;
        currentTimeRef.current = currentTime;
      }

      const progress = calculateProgress(currentTime, duration);

      // Проверяем порог прослушивания
      const threshold = config.listenThreshold(duration);
      if (currentTime >= threshold && !listenThresholdReachedRef.current) {
        listenThresholdReachedRef.current = true;
        config.onListenThresholdReached(currentTime, duration);
      }

      // Проверяем завершение трека
      if (currentTime >= duration - 0.5) {
        console.log('🔄 Трек завершен по таймеру');
        cleanup();
        config.onTrackEnd();
        return;
      }

      // Обновляем время только если трек реально играет
      if (!audioElementRef.current || !audioElementRef.current.paused) {
        config.onTimeUpdate(currentTime, duration, progress);
      }
    }, config.updateInterval);
  }, [cleanup, config]);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    cleanup();
    console.log('⏸️ Таймер прогресса приостановлен');
  }, [cleanup]);

  const resume = useCallback(() => {
    if (!isRunningRef.current && intervalRef.current === null) {
      start(audioElementRef.current);
      console.log('▶️ Таймер прогресса возобновлен');
    }
  }, [start]);

  const stop = useCallback(() => {
    cleanup();
    currentTimeRef.current = 0;
    listenThresholdReachedRef.current = false;
    console.log('⏹️ Таймер прогресса остановлен');
  }, [cleanup]);

  const setTime = useCallback((time: number) => {
    currentTimeRef.current = Math.max(0, time);
    listenThresholdReachedRef.current = false; // Сбрасываем флаг при перемотке
    
    // Проверяем, нужно ли сразу отметить порог как достигнутый
    const threshold = config.listenThreshold(durationRef.current);
    if (time >= threshold) {
      listenThresholdReachedRef.current = true;
    }
  }, [config]);

  const setDuration = useCallback((duration: number) => {
    durationRef.current = Math.max(0, duration);
  }, []);

  const getCurrentTime = useCallback(() => {
    return audioElementRef.current?.currentTime ?? currentTimeRef.current;
  }, []);

  const getDuration = useCallback(() => {
    return audioElementRef.current?.duration ?? durationRef.current;
  }, []);

  const getProgress = useCallback(() => {
    const currentTime = getCurrentTime();
    const duration = getDuration();
    return calculateProgress(currentTime, duration);
  }, [getCurrentTime, getDuration]);

  const isRunning = useCallback(() => {
    return isRunningRef.current;
  }, []);

  const hasReachedListenThreshold = useCallback(() => {
    return listenThresholdReachedRef.current;
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    start,
    pause,
    resume,
    stop,
    setTime,
    setDuration,
    getCurrentTime,
    getDuration,
    getProgress,
    isRunning,
    hasReachedListenThreshold
  };
}
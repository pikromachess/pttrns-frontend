/**
 * Форматирует время в секундах в строку MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Вычисляет прогресс воспроизведения в процентах
 */
export function calculateProgress(currentTime: number, duration: number): number {
  if (duration === 0) return 0;
  return Math.min((currentTime / duration) * 100, 100);
}

/**
 * Преобразует процент прогресса в время
 */
export function progressToTime(progress: number, duration: number): number {
  return (progress / 100) * duration;
}

/**
 * Проверяет, является ли аудио элемент готовым к воспроизведению
 */
export function isAudioReady(audio: HTMLAudioElement): boolean {
  return audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
}

/**
 * Безопасно устанавливает время аудио элемента
 */
export function safeSeek(audio: HTMLAudioElement, time: number): boolean {
  try {
    if (isNaN(time) || time < 0) return false;
    const duration = audio.duration || 0;
    if (time > duration) time = duration;
    audio.currentTime = time;
    return true;
  } catch (error) {
    console.error('Ошибка при перемотке:', error);
    return false;
  }
}

/**
 * Безопасно устанавливает громкость аудио элемента
 */
export function safeSetVolume(audio: HTMLAudioElement, volume: number): boolean {
  try {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;
    return true;
  } catch (error) {
    console.error('Ошибка при установке громкости:', error);
    return false;
  }
}
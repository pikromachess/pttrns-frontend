import { useState, useRef, useEffect, useCallback } from 'react';

interface UseProgressSliderProps {
  onSeek: (percentage: number) => void;
  progress: number;
}

export function useProgressSlider({ onSeek, progress }: UseProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef(false);
  const lastValidProgressRef = useRef(0);

  // Обновляем последний валидный прогресс когда не перетаскиваем
  useEffect(() => {
    if (!isDragging) {
      lastValidProgressRef.current = progress;
    }
  }, [progress, isDragging]);

  const calculateProgress = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!progressRef.current) return lastValidProgressRef.current;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const percentage = Math.min(Math.max((clickX / rect.width) * 100, 0), 100);
    
    return percentage;
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Progress slider: start dragging');
    
    const newProgress = calculateProgress(e);
    setIsDragging(true);
    setDragProgress(newProgress);
    dragStartRef.current = true;
    
    // Тактильная обратная связь
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  }, [calculateProgress]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    e.preventDefault();
    const newProgress = calculateProgress(e);
    setDragProgress(newProgress);
  }, [isDragging, calculateProgress]);

  const handleEnd = useCallback(() => {
    if (!isDragging || !dragStartRef.current) return;
    
    console.log('Progress slider: end dragging, seeking to:', dragProgress);
    
    // Применяем позицию
    onSeek(dragProgress);
    lastValidProgressRef.current = dragProgress;
    
    setIsDragging(false);
    dragStartRef.current = false;
    
    // Тактильная обратная связь
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  }, [isDragging, dragProgress, onSeek]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    // Проверяем что клик был по самому треку
    if (e.target === progressRef.current && !isDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      const newProgress = calculateProgress(e);
      console.log('Progress slider: track click, seeking to:', newProgress);
      
      onSeek(newProgress);
      lastValidProgressRef.current = newProgress;
      
      // Тактильная обратная связь
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  }, [calculateProgress, onSeek, isDragging]);

  // Глобальные обработчики событий
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      handleMove(e);
    };

    const handleGlobalEnd = () => {
      handleEnd();
    };

    // Добавляем обработчики
    document.addEventListener('mousemove', handleGlobalMove, { passive: false });
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('touchcancel', handleGlobalEnd);

    // Предотвращаем скролл во время перетаскивания
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('touchcancel', handleGlobalEnd);
      
      // Восстанавливаем скролл
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging, handleMove, handleEnd]);

  // Возвращаем отображаемый прогресс (внутренний во время перетаскивания)
  const displayProgress = isDragging ? dragProgress : progress;

  return {
    isDragging,
    displayProgress,
    progressRef,
    handleStart,
    handleTrackClick
  };
}
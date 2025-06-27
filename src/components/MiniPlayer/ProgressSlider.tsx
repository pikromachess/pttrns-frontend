// components/MiniPlayer/ProgressSlider.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ProgressSliderProps {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (percentage: number) => void;
  formatTime: (seconds: number) => string;
}

export function ProgressSlider({ 
  progress, 
  currentTime, 
  duration, 
  onSeek, 
  formatTime 
}: ProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef(false);

  // Используем внутренний прогресс во время перетаскивания
  const displayProgress = isDragging ? dragProgress : progress;

  const calculateProgress = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!progressRef.current) return 0;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const percentage = Math.min(Math.max((clickX / rect.width) * 100, 0), 100);
    
    return percentage;
  }, []);

  const handleProgressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();   
    
    setIsDragging(true);
    dragStartRef.current = true;
    
    const newProgress = calculateProgress(e);
    setDragProgress(newProgress);
    
    // Добавляем тактильную обратную связь
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  }, [calculateProgress]);

  const handleProgressMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    e.preventDefault();
    const newProgress = calculateProgress(e);
    setDragProgress(newProgress);
  }, [isDragging, calculateProgress]);

  const handleProgressEnd = useCallback(() => {
    if (!isDragging || !dragStartRef.current) return;
       
    
    // Применяем финальную позицию
    onSeek(dragProgress);
    
    setIsDragging(false);
    dragStartRef.current = false;
    
    // Добавляем тактильную обратную связь
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  }, [isDragging, dragProgress, onSeek]);

  // Обработчики для кнопки перемотки
  const handleKnobStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    handleProgressStart(e);
  }, [handleProgressStart]);

  // Обработчик клика по полосе прогресса
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    // Проверяем, что клик был именно по треку, а не по кнопке
    if (e.target === progressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      
      const newProgress = calculateProgress(e);      
      onSeek(newProgress);
      
      // Добавляем тактильную обратную связь
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  }, [calculateProgress, onSeek]);

  // Глобальные обработчики для перетаскивания
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      handleProgressMove(e);
    };

    const handleGlobalEnd = () => {
      handleProgressEnd();
    };

    // Добавляем обработчики для мыши и касаний
    document.addEventListener('mousemove', handleGlobalMove, { passive: false });
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [isDragging, handleProgressMove, handleProgressEnd]);

  // Предотвращаем скролл страницы во время перетаскивания
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging]);

  return (
    <div style={{ width: '100%', marginBottom: '20px' }}>
      <div
        ref={progressRef}
        data-progress="true"
        onClick={handleTrackClick}
        style={{
          height: '6px',
          backgroundColor: '#333',
          borderRadius: '3px',
          cursor: 'pointer',
          marginBottom: '8px',
          position: 'relative',
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: '#2AABEE',
            borderRadius: '3px',
            width: `${displayProgress}%`,
            transition: isDragging ? 'none' : 'width 0.1s ease',
            position: 'relative'
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              right: '-9px',
              top: '-6px',              
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#2AABEE',
              border: '2px solid #fff',
              cursor: isDragging ? 'grabbing' : 'grab',
              zIndex: 10,
              touchAction: 'none',
              userSelect: 'none'
            }}
            onMouseDown={handleKnobStart}
            onTouchStart={handleKnobStart}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 1.1 }}
            animate={{ 
              scale: isDragging ? 1.3 : 1,
              boxShadow: isDragging 
                ? '0 4px 12px rgba(42, 171, 238, 0.4)' 
                : '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#999',
        userSelect: 'none'
      }}>
        <span>{formatTime(isDragging ? (dragProgress / 100) * duration : currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
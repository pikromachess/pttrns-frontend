// hooks/useVolumeSlider.ts
import { useState, useRef, useEffect } from 'react';

export function useVolumeSlider(onVolumeChange: (volume: number) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const handleVolumeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleVolumeUpdate(e);
  };

  const handleVolumeMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDragging) return;
    handleVolumeUpdate(e);
  };

  const handleVolumeEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleVolumeUpdate = (e: React.MouseEvent | React.TouchEvent) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const percentage = Math.min(Math.max((clickX / rect.width), 0), 1);
    onVolumeChange(percentage);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleVolumeMove(e as any);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        handleVolumeEnd(e as any);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return {
    isDragging,
    volumeRef,
    handleVolumeStart,
    handleVolumeMove,
    handleVolumeEnd
  };
}


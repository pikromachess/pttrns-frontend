// hooks/useMiniPlayer.ts
import { useState, useRef, useEffect } from 'react';
import { triggerHapticFeedback } from '../helpers';

export function useMiniPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      document.body.classList.add('player-expanded');
    } else {
      document.body.classList.remove('player-expanded');
    }

    return () => {
      document.body.classList.remove('player-expanded');
    };
  }, [isExpanded]);

  const handleMiniPlayerClick = (e: React.MouseEvent) => {    
    if (e.target instanceof Element && 
        (e.target.closest('button') || e.target.closest('[data-progress]') || e.target.closest('[data-volume]'))) {
      return;
    }
    setIsExpanded(true);
    triggerHapticFeedback();
  };

  const handleHandleClick = () => {
    setIsExpanded(!isExpanded);    
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    triggerHapticFeedback();
  };

  return {
    isExpanded,
    playerRef,
    handleMiniPlayerClick,
    handleHandleClick
  };
}
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  showVolumeSlider: boolean;
  onVolumeButtonClick: (e: React.MouseEvent) => void;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ 
  volume, 
  isMuted,   
  onVolumeButtonClick, 
  onVolumeChange 
}: VolumeControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const handleVerticalVolumeUpdate = (e: React.MouseEvent | React.TouchEvent) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clickY = clientY - rect.top;
    const percentage = Math.min(Math.max(1 - (clickY / rect.height), 0), 1);
    onVolumeChange(percentage);
  };

  const handleVolumeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleVerticalVolumeUpdate(e);
  };

  const handleVolumeMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDragging) return;
    handleVerticalVolumeUpdate(e);
  };

  const handleVolumeEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(false);
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

  return (
    <div style={{ 
      position: 'absolute',
      left: '220px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      <motion.button
        onClick={onVolumeButtonClick}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#333',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        {isMuted ? (
          <SpeakerXMarkIcon
            style={{
              width: '24px',
              height: '24px',
              stroke: '#fff',
              strokeWidth: 1.5,
              fill: 'none'
            }}
          />
        ) : (
          <SpeakerWaveIcon
            style={{
              width: '24px',
              height: '24px',
              stroke: '#fff',
              strokeWidth: 1.5,
              fill: 'none'
            }}
          />
        )}
      </motion.button>

      <div
        ref={volumeRef}
        data-volume="true"
        onMouseDown={handleVolumeStart}
        onTouchStart={handleVolumeStart}
        style={{
          width: '32px',
          height: '96px',
          backgroundColor: '#333',
          borderRadius: '16px',
          cursor: 'pointer',
          touchAction: 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden'
        }}
      >
        <motion.div
          style={{
            width: '100%',
            background: isMuted 
              ? '#666' 
              : '#2AABEE',            
            height: `${(isMuted ? 0 : volume) * 100}%`,
            transition: isDragging ? 'none' : 'height 0.3s ease',
            position: 'relative',
            backgroundSize: '100% 200%',
            backgroundPosition: 'bottom'
          }}
          animate={{
            backgroundPosition: isMuted ? 'bottom' : 'top'
          }}
          transition={{ duration: isDragging ? 0 : 0.3 }}
        >          
        </motion.div>
      </div>
    </div>
  );
}
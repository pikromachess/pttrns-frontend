import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  ForwardIcon, 
  BackwardIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon 
} from '@heroicons/react/24/outline';
import { usePlayer } from '../../contexts/PlayerContext';
import { triggerHapticFeedback } from '../../helpers';

interface MiniPlayerCollapsedProps {
  onPlayerClick: (e: React.MouseEvent) => void;
}

export function MiniPlayerCollapsed({ onPlayerClick }: MiniPlayerCollapsedProps) {
  const { 
    currentNft, 
    isPlaying, 
    isMuted,
    togglePlay,
    playNextTrack, 
    playPreviousTrack,
    toggleMute
  } = usePlayer();

  const handleVolumeButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
    triggerHapticFeedback();
  };

  const handlePreviousTrack = () => {
    playPreviousTrack();
  };

  const handleNextTrack = () => {
    playNextTrack();
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        height: '48px',
        cursor: 'pointer'
      }}
      onClick={onPlayerClick}
    >
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        overflow: 'hidden',
        marginRight: '12px'
      }}>
        {currentNft?.metadata?.image ? (
          <img
            src={currentNft.metadata.image}
            alt={currentNft.metadata.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: '#999'
          }}>
            NFT
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '500',
          color: '#fff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {currentNft?.metadata?.name || 'Без названия'}
        </div>
        <div style={{
          fontSize: '10px',
          color: '#999',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {currentNft?.collection?.name || 'Без коллекции'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Кнопка громкости в мини-режиме */}
        <motion.button
          onClick={handleVolumeButtonClick}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0
          }}
        >
          {isMuted ? (
            <SpeakerXMarkIcon
              style={{
                width: '14px',
                height: '14px',
                color: '#999'
              }}
            />
          ) : (
            <SpeakerWaveIcon
              style={{
                width: '14px',
                height: '14px',
                color: '#999'
              }}
            />
          )}
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handlePreviousTrack();
          }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2AABEE',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <BackwardIcon
            style={{
              width: '16px',
              height: '16px',
              color: '#fff'
            }}
          />
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2AABEE',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0
          }}
        >
          {isPlaying ? (
            <PauseIcon
              style={{
                width: '16px',
                height: '16px',
                color: '#fff'
              }}
            />
          ) : (
            <PlayIcon
              style={{
                width: '16px',
                height: '16px',
                color: '#fff',
                marginLeft: '1px'
              }}
            />
          )}
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleNextTrack();
          }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2AABEE',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ForwardIcon
            style={{
              width: '16px',
              height: '16px',
              color: '#fff'
            }}
          />
        </motion.button>
      </div>
    </div>
  );
}
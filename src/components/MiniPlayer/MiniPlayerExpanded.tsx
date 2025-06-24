import { motion } from 'framer-motion';
import {   
  PauseIcon, 
  ForwardIcon, 
  BackwardIcon  
} from '@heroicons/react/24/outline';
import { 
  PlayIcon   
} from '@heroicons/react/24/solid';
import { usePlayer } from '../../contexts/PlayerContext';
import { triggerHapticFeedback } from '../../helpers';
import { ProgressSlider } from './ProgressSlider';
import { VolumeControl } from './VolumeControl';

export function MiniPlayerExpanded() {
  const { 
    currentNft, 
    isPlaying, 
    progress, 
    currentTime, 
    duration,
    volume,
    isMuted,
    togglePlay, 
    seekTo,     
    playNextTrack, 
    playPreviousTrack,
    changeVolume,
    toggleMute    
  } = usePlayer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreviousTrack = () => {
    playPreviousTrack();
  };

  const handleNextTrack = () => {
    playNextTrack();
  };

  const handleVolumeButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
    triggerHapticFeedback();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: 'calc(100% - 16px)',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {/* Контейнер для обложки с контролом громкости */}
      <div style={{ 
        position: 'relative',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '8px',
          overflow: 'hidden'
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
              fontSize: '12px',
              color: '#999'
            }}>
              Нет изображения
            </div>
          )}
        </div>

        {/* Контрол громкости справа от обложки */}
        <VolumeControl          
          volume={volume}
          isMuted={isMuted}
          showVolumeSlider={true}
          onVolumeButtonClick={handleVolumeButtonClick}
          onVolumeChange={changeVolume}
        />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#fff',
          marginBottom: '4px'
        }}>
          {currentNft?.metadata?.name || 'Без названия'}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#999'
        }}>
          {currentNft?.collection?.name || 'Без коллекции'}
        </div>
      </div>

      {/* Полоса прогресса */}
      <ProgressSlider 
        progress={progress}
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTo}
        formatTime={formatTime}
      />

      {/* Основные кнопки управления */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <motion.button
          onClick={handlePreviousTrack}
          whileTap={{ scale: 0.95 }}
          whileHover={{ backgroundColor: '#3B4A5C', borderColor: '#61DAFB' }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#2AABEE',
            border: '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.25s, border-color 0.25s'
          }}
        >
          <BackwardIcon
            style={{
              width: '24px',
              height: '24px',
              stroke: '#fff',
              strokeWidth: 1.5,
              fill: 'none'
            }}
          />
        </motion.button>

        <motion.button
          onClick={togglePlay}
          whileTap={{ scale: 0.95 }}
          whileHover={{ backgroundColor: '#3B4A5C', borderColor: '#61DAFB' }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#2AABEE',
            border: '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.25s, border-color 0.25s'
          }}
        >
          {isPlaying ? (
            <PauseIcon
              style={{
                width: '24px',
                height: '24px',
                stroke: '#fff',
                strokeWidth: 1.5,
                fill: 'none'
              }}
            />
          ) : (
            <PlayIcon
              style={{
                width: '48px',
                height: '48px',
                stroke: '#fff',
                strokeWidth: 1.5,
                fill: 'none',
                marginLeft: '2px'
              }}
            />
          )}
        </motion.button>

        <motion.button
          onClick={handleNextTrack}
          whileTap={{ scale: 0.95 }}
          whileHover={{ backgroundColor: '#3B4A5C', borderColor: '#61DAFB' }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#2AABEE',
            border: '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.25s, border-color 0.25s'
          }}
        >
          <ForwardIcon
            style={{
              width: '24px',
              height: '24px',
              stroke: '#fff',
              strokeWidth: 1.5,
              fill: 'none'
            }}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}
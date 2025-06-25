// src/components/PlayingAnimation/PlayingAnimation.tsx
import { motion } from 'framer-motion';

interface PlayingAnimationProps {
  isPlaying: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function PlayingAnimation({ isPlaying, size = 'medium' }: PlayingAnimationProps) {
  const sizeConfig = {
    small: { width: 16, height: 16, barWidth: 2, gap: 1 },
    medium: { width: 20, height: 20, barWidth: 2, gap: 1 },
    large: { width: 24, height: 24, barWidth: 3, gap: 2 }
  };

  const config = sizeConfig[size];
  const barCount = 4;

  return (
    <div 
      style={{
        width: config.width,
        height: config.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: config.gap
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <motion.div
          key={index}
          style={{
            width: config.barWidth,
            backgroundColor: '#2AABEE',
            borderRadius: config.barWidth / 2,
            transformOrigin: 'center bottom'
          }}
          animate={
            isPlaying
              ? {
                  height: [
                    config.height * 0.3,
                    config.height * 0.8,
                    config.height * 0.4,
                    config.height * 0.9,
                    config.height * 0.3
                  ]
                }
              : {
                  height: config.height * 0.3
                }
          }
          transition={
            isPlaying
              ? {
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.1
                }
              : {
                  duration: 0.3
                }
          }
        />
      ))}
    </div>
  );
}
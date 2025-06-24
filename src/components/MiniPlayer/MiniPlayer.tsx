import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../../contexts/PlayerContext';
import { MiniPlayerCollapsed } from './MiniPlayerCollapsed';
import { MiniPlayerExpanded } from './MiniPlayerExpanded';
import { miniPlayerStyles } from './MiniPlayer.styles';
import { useMiniPlayer } from '../../hooks/useMiniPlayer';

export function MiniPlayer() {
  const { isPlayerVisible, currentNft } = usePlayer();
  const { isExpanded, playerRef, handleMiniPlayerClick, handleHandleClick } = useMiniPlayer();

  if (!isPlayerVisible || !currentNft) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={playerRef}
        initial={{ y: 100, opacity: 0 }}
        animate={{ 
          y: 0,
          opacity: 1,
          height: isExpanded ? `calc(100vh - var(--safe-area-top) - 98px - 60px)` : 76
        }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{
          ...miniPlayerStyles.playerContainer,
          borderRadius: isExpanded ? '0px' : '12px 12px 0 0',
        }}
      >
        {/* Хэндл для сворачивания/разворачивания */}
        <div
          style={miniPlayerStyles.handle}
          onClick={handleHandleClick}
        />

        {/* Свернутый вид */}
        {!isExpanded && (
          <MiniPlayerCollapsed onPlayerClick={handleMiniPlayerClick} />
        )}

        {/* Развернутый вид */}
        {isExpanded && (
          <MiniPlayerExpanded />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
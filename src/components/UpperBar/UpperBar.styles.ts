import type { CSSProperties } from 'react';

export const upperBarStyles: Record<string, CSSProperties> = {
  centerContent: {
    position: 'absolute',
    left: '50%',
    top: 'calc(var(--safe-area-top) + 12px)',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 15,
  },

  appIcon: {
    width: '36px',
    height: '36px',
    objectFit: 'contain',
  },

  lovesText: {
    margin: 0,
    color: '#fff',
    fontSize: '14px',
  },

  telegramAvatar: {
    width: '24px',
    height: '24px',
    objectFit: 'cover',
    borderRadius: '50%',
    marginLeft: '6px',
  },
};
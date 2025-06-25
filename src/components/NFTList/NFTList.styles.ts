// src/components/NFTList/NFTList.styles.ts
import type { CSSProperties } from 'react';

export const nftListStyles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '600px',
    padding: '0 8px',
    // Добавляем отступ снизу для миниплеера и кнопки обновления
    paddingBottom: '120px', // Миниплеер (48px) + кнопка обновления (~40px) + буфер (32px)
  },

  loadingContainer: {
    padding: '16px',
    textAlign: 'center',
    color: '#fff',
  },

  errorContainer: {
    padding: '16px',
    textAlign: 'center',
    color: '#ff4d4d',
  },

  emptyContainer: {
    padding: '16px',
    textAlign: 'center',
    color: '#fff',
  },

  nftItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    marginBottom: '6px',
    borderRadius: '6px',
    transition: 'background-color 0.2s, border-color 0.2s',
    minHeight: '60px',
    touchAction: 'manipulation',
    userSelect: 'none',
  },

  imageContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '4px',
    backgroundColor: '#000',
    overflow: 'hidden',
    marginRight: '12px',
    flexShrink: 0,
    position: 'relative',
  },

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  noImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#999',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    zIndex: 2,
  },

  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(42, 171, 238, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    backdropFilter: 'blur(1px)',
    zIndex: 1,
  },

  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #fff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  textContainer: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    transition: 'color 0.2s',
  },

  titlePlaying: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2AABEE',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    transition: 'color 0.2s',
  },

  subtitle: {
    fontSize: '14px',
    color: '#b3b3b3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    transition: 'color 0.2s',
  },

  subtitlePlaying: {
    fontSize: '14px',
    color: 'rgba(42, 171, 238, 0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    transition: 'color 0.2s',
  },
};
import type { CSSProperties } from 'react';

export const miniPlayerStyles: Record<string, CSSProperties> = {
  // Основной контейнер
  playerContainer: {
    position: 'fixed',
    bottom: 'calc(var(--safe-area-bottom) + 60px)',
    left: 'calc(var(--safe-area-left))',
    right: 'calc(var(--safe-area-right))',
    backgroundColor: '#1c1c1c',
    zIndex: 30,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
  },

  // Хэндл
  handle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#666',
    borderRadius: '2px',
    margin: '8px auto 4px',
    cursor: 'pointer'
  },

  // Свернутый режим
  collapsedContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    height: '48px',
    cursor: 'pointer'
  },

  collapsedImage: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginRight: '12px'
  },

  collapsedImageContent: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  collapsedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '8px',
    color: '#999'
  },

  collapsedText: {
    flex: 1,
    minWidth: 0
  },

  collapsedTitle: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  collapsedSubtitle: {
    fontSize: '10px',
    color: '#999',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  collapsedControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  // Развернутый режим
  expandedContainer: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: 'calc(100% - 16px)',
    justifyContent: 'center'
  },

  expandedImage: {
    width: '200px',
    height: '200px',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '20px'
  },

  expandedImageContent: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  expandedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#999'
  },

  expandedTextContainer: {
    textAlign: 'center',
    marginBottom: '20px'
  },

  expandedTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '4px'
  },

  expandedSubtitle: {
    fontSize: '14px',
    color: '#999'
  },

  expandedMainControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  // Кнопки
  smallButton: {
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
  },

  mediumButton: {
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
  },

  largeButton: {
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
  },

  volumeButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#333',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0
  },

  // Слайдеры
  progressContainer: {
    width: '100%',
    marginBottom: '20px'
  },

  progressSlider: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    cursor: 'pointer',
    marginBottom: '8px',
    zIndex: 32,
    touchAction: 'none'
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#2AABEE',
    borderRadius: '3px',
    position: 'relative'
  },

  progressHandle: {
    position: 'absolute',
    right: '-8px',
    top: '-7px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#2AABEE',
    border: '2px solid #fff',
    cursor: 'grab',
    zIndex: 33
  },

  timeDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#999'
  },

  // Контролы громкости
  volumeContainer: {
    width: '100%',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative'
  },

  volumeSlider: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    cursor: 'pointer',
    touchAction: 'none',
    position: 'relative'
  },

  volumeFill: {
    height: '100%',
    borderRadius: '3px',
    position: 'relative'
  },

  volumeHandle: {
    position: 'absolute',
    right: '-8px',
    top: '-7px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid #fff',
    cursor: 'grab',
    zIndex: 34
  },

  volumeIndicator: {
    fontSize: '12px',
    color: '#999',
    minWidth: '35px'
  },

  // Иконки
  smallIcon: {
    width: '14px',
    height: '14px'
  },

  mediumIcon: {
    width: '16px',
    height: '16px',
    color: '#fff'
  },

  largeIcon: {
    width: '24px',
    height: '24px',
    stroke: '#fff',
    strokeWidth: 1.5,
    fill: 'none'
  },

  volumeIcon: {
    width: '20px',
    height: '20px'
  }
};
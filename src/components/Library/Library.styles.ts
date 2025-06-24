import type { CSSProperties } from 'react';

export const libraryStyles: Record<string, CSSProperties> = {
  app: {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
  },

  mainContent: {
    position: 'relative',
    paddingTop: 'calc(var(--safe-area-top) + 116px)',
    paddingBottom: 'calc(var(--safe-area-bottom) + 60px)', // Базовый отступ для навбара
    paddingLeft: 'calc(var(--safe-area-left))',
    paddingRight: 'calc(var(--safe-area-right))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
    flex: 1,
    // Убираем переполнение по вертикали
    overflowY: 'auto',
  },

  noWalletMessage: {
    padding: '12px',
    textAlign: 'center',
    color: 'var(--tg-theme-text-color, #fff)',
  },

  noTokenMessage: {
    padding: '12px',
    textAlign: 'center',
    color: 'var(--tg-theme-text-color, #fff)',
  },

  contentContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '16px',
    // Убеждаемся, что контейнер занимает всю доступную высоту
    flex: 1,
  },

  refreshButton: {
    marginTop: '12px',
    marginBottom: '24px', // Увеличиваем отступ снизу для видимости над миниплеером
    padding: '6px 14px',
    backgroundColor: '#2AABEE',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    // Добавляем минимальную высоту для лучшего отображения
    minHeight: '32px',
  },
};
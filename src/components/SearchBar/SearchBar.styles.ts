import type { CSSProperties } from 'react';

export const searchBarStyles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
  },

  searchContainer: {
    height: '40px',
    borderRadius: '100vh',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },

  searchIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    padding: '0 12px 0 0',
    border: 'none',
    borderRadius: '100vh',
    fontSize: '14px',
    backgroundColor: '#121214',
    color: '#fff',
    outline: 'none',
  },

  sortButton: {
    width: '40px',
    height: '40px',
    borderRadius: '100vh',
    backgroundColor: '#121214',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginLeft: '6px',
    marginRight: '6px',
  },

  sortMenu: {
    position: 'absolute',
    top: 'calc(var(--safe-area-top) + 104px)',
    left: 'calc(var(--safe-area-left) + 46px)',
    backgroundColor: '#121214',
    borderRadius: '6px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
    zIndex: 20,
    padding: '8px 0',
  },

  sortOption: {
    padding: '8px 16px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },

  icon: {
    width: '24px',
    height: '24px',
    color: '#fff',
  },
};
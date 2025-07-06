import { forwardRef } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { SearchBar } from '../SearchBar/SearchBar';
import icon from '../../assets/icon.png';
import { upperBarStyles } from './UpperBar.styles';

interface UpperBarProps {
  isSearchVisible: boolean;
  setIsSearchVisible: (visible: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSortMenuOpen: boolean;
  setIsSortMenuOpen: (open: boolean) => void;
  onSortSelect: (sortOption: string) => void;
  searchWidth: () => number;
  tonConnectButtonRef: React.RefObject<HTMLDivElement | null>;
}

export const UpperBar = forwardRef<HTMLDivElement | null, UpperBarProps>(({
  isSearchVisible,
  setIsSearchVisible,
  searchQuery,
  setSearchQuery,
  isSortMenuOpen,
  setIsSortMenuOpen,
  onSortSelect,
  searchWidth,
  tonConnectButtonRef,
}, ref) => {
  const isTelegram = !!(window.Telegram && window.Telegram.WebApp);
  const telegramAvatar = isTelegram && window.Telegram.WebApp.initDataUnsafe?.user?.photo_url;  

  return (
    <div className="upper-bar" ref={ref}>
      <div className="search-container">
        <SearchBar
          isSearchVisible={isSearchVisible}
          setIsSearchVisible={setIsSearchVisible}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSortMenuOpen={isSortMenuOpen}
          setIsSortMenuOpen={setIsSortMenuOpen}
          onSortSelect={onSortSelect}
          searchWidth={searchWidth}
        />
      </div>
      
      <div className="tonConnectButton" ref={tonConnectButtonRef}>
        <TonConnectButton />
      </div>
      
      <div style={upperBarStyles.centerContent}>
        <img
          src={icon}
          alt="App Icon"
          style={upperBarStyles.appIcon}
        />
        
        {isTelegram && telegramAvatar && (
          <>
            <p style={upperBarStyles.lovesText}> loves </p>
            <img
              src={telegramAvatar}
              alt="Telegram Avatar"
              style={upperBarStyles.telegramAvatar}
            />
          </>
        )}
      </div>
    </div>
  );
});
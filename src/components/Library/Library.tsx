import { useState, useRef, useEffect, useContext } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { BackendTokenContext } from '../../BackendTokenContext';
import { triggerHapticFeedback } from '../../helpers';
import { useNFT } from '../../contexts/NFTContext';
import { useSession } from '../../contexts/SessionContext';
import { useToast, Toast } from '../Toast/Toast';
import { UpperBar } from '../UpperBar/UpperBar';
import { NFTList } from '../NFTList/NFTList';
import { NavBar } from '../NavBar/NavBar';
import { libraryStyles } from './Library.styles';
import '../../App.css';

export default function Library() {
  const wallet = useTonWallet();
  const { token } = useContext(BackendTokenContext);
  const { nfts, loading, error, network, loadNftsForWallet, refreshNfts } = useNFT();
  const { toastData, hideToast } = useToast();
  const { hasActiveSession } = useSession();
  
  // Состояние для поиска и сортировки
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  
  // Refs для элементов
  const upperBarRef = useRef<HTMLDivElement | null>(null);
  const tonConnectButtonRef = useRef<HTMLDivElement | null>(null);
  const prevWalletRef = useRef<{address?: string, chain?: string}>({});

  // Обработчики событий
  const handleRefresh = () => {
    if (wallet?.account?.address && network && token) {
      refreshNfts(wallet.account.address, network);
      triggerHapticFeedback();
    }
  };

  const handleSortSelect = (sortOption: string) => {
    setSortBy(sortOption);
    triggerHapticFeedback();
  };

  const searchWidth = () => {
    if (upperBarRef.current && tonConnectButtonRef.current) {
      const upperBarWidth = upperBarRef.current.offsetWidth;
      const tonButtonWidth = tonConnectButtonRef.current.offsetWidth;
      const paddingAndGap = 6 + 6 + 6 + 40;
      const iconWidth = 40;
      return Math.max(140, upperBarWidth - tonButtonWidth - paddingAndGap - iconWidth);
    }
    return 140;
  };

  // Эффект для отслеживания изменений кошелька
  useEffect(() => {
    const currentWallet = {
      address: wallet?.account?.address,
      chain: wallet?.account?.chain
    };
    
    // Проверяем, изменились ли данные кошелька
    const walletChanged = 
      prevWalletRef.current.address !== currentWallet.address ||
      prevWalletRef.current.chain !== currentWallet.chain;
    
    if (walletChanged) {      
      prevWalletRef.current = currentWallet;
      
      if (currentWallet.address && currentWallet.chain && token) {
        loadNftsForWallet(currentWallet.address, currentWallet.chain);
      }
    }
  }, [wallet?.account?.address, wallet?.account?.chain, token, loadNftsForWallet]);

  // Рендер основного контента
  const renderMainContent = () => {
    if (!wallet) {
      return (
        <div style={libraryStyles.noWalletMessage}>
          <p>Подключите кошелек для просмотра ваших NFT</p>
        </div>
      );
    }

    if (!token) {
      return (
        <div style={libraryStyles.noTokenMessage}>
          <p>Подождите авторизацию...</p>
        </div>
      );
    }

    return (
      <div style={libraryStyles.contentContainer}>
        <NFTList 
          nfts={nfts} 
          loading={loading} 
          error={error} 
          searchQuery={searchQuery} 
          sortBy={sortBy} 
        />
        {!loading && wallet.account?.address && network && token && (
          <motion.button
            onClick={handleRefresh}
            style={libraryStyles.refreshButton}
            whileTap={{ scale: 0.95 }}
          >
            Обновить список
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <UpperBar
        ref={upperBarRef}
        isSearchVisible={isSearchVisible}
        setIsSearchVisible={setIsSearchVisible}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSortMenuOpen={isSortMenuOpen}
        setIsSortMenuOpen={setIsSortMenuOpen}
        onSortSelect={handleSortSelect}
        searchWidth={searchWidth}
        tonConnectButtonRef={tonConnectButtonRef}
        hasActiveSession={hasActiveSession}
      />
      <div className="main-content">
        {renderMainContent()}
      </div>
      <NavBar />
      
      {/* Toast уведомления */}
      <Toast
        isVisible={toastData.isVisible}
        message={toastData.message}
        type={toastData.type}
        onClose={hideToast}
      />
    </div>
  );
}
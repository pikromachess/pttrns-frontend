import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { backendApi } from '../../backend-api';
import { CollectionHeader } from './CollectionHeader';
import { NFTStatItem } from './NFTStatItem';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { NavBar } from '../NavBar/NavBar';
import { UpperBar } from '../UpperBar/UpperBar';
import '../../App.css';
import type { Collection, NFTWithListens } from '../../types/nft';
import { useCustomBackButton } from '../../hooks/useCustomBackButton';

export default function CollectionPage() {
  const { address } = useParams<{ address: string }>();  
  const location = useLocation();
  const collection = location.state?.collection as Collection;
  const [nfts, setNfts] = useState<NFTWithListens[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const tonConnectButtonRef = useRef<HTMLDivElement | null>(null);
  const upperBarRef = useRef<HTMLDivElement | null>(null); 
  const navigate = useNavigate();

  useCustomBackButton({
    onBack: () => {      
      navigate('/'); // Всегда возвращаемся на главную
    }
  });

  const formatListens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };  

  const onSortSelect = () => {        
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

  useEffect(() => {
    const fetchCollectionNfts = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        setError(null);
        
        
        
        const response = await backendApi.getCollectionNftsStats(address, 50);
        
        if (response && response.nfts) {     
          setNfts(response.nfts);
        } else {
          setError('Не удалось загрузить статистику коллекции');
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки статистики:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionNfts();
  }, [address]);

  return (
    <div className="app">
      <UpperBar
        isSearchVisible={isSearchVisible}
        setIsSearchVisible={setIsSearchVisible}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSortMenuOpen={isSortMenuOpen}
        setIsSortMenuOpen={setIsSortMenuOpen}
        onSortSelect={onSortSelect}
        searchWidth={searchWidth}
        tonConnectButtonRef={tonConnectButtonRef}
      />

      <div className="main-content">
        <div style={{ 
          width: '100%', 
          maxWidth: '600px', 
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {collection && (
            <CollectionHeader 
              collection={collection} 
              formatListens={formatListens} 
            />
          )}

          <div style={{
            padding: '0 4px',
            marginBottom: '8px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
              margin: 0
            }}>
              Статистика прослушиваний NFT
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#999',
              margin: '4px 0 0 0'
            }}>
              Все NFT в коллекции
            </p>
          </div>

          {loading && <LoadingState />}
          {error && <ErrorState error={error} />}
          {!loading && !error && nfts.length === 0 && <EmptyState />}

          {!loading && !error && nfts.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '120px'
            }}>
              {nfts.map((nft, index) => (
                <NFTStatItem
                  key={nft.address}
                  nft={nft}
                  index={index}
                  formatListens={formatListens}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <NavBar />            

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
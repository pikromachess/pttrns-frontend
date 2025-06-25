import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './App.css';
import { UpperBar } from './components/UpperBar/UpperBar';
import { backendApi } from './backend-api';
import { NavBar } from './components/NavBar/NavBar';
import type { Collection } from './types/nft';

function App() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const tonConnectButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Получаем данные о коллекциях из API
        const response = await backendApi.getCollections();
        if (response && response.collections) {
          setCollections(response.collections);
        } else {
          setError('Не удалось загрузить коллекции');
        }
      } catch (err) {
        console.error('Ошибка загрузки коллекций:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  const handleCollectionClick = (collection: Collection) => {
    navigate(`/collection/${collection.address}`, { 
      state: { collection } 
    });
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const formatListens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const onSortSelect = (sortOption: string) => {
    console.log('Selected sort option:', sortOption);
    // Implement sorting logic here if needed
  };

  const searchWidth = () => {
    return tonConnectButtonRef.current?.offsetWidth || 0;
  };

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
          <div style={{
            textAlign: 'center',
            padding: '20px 0',
          }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#fff',
              marginBottom: '8px'
            }}>
              Музыкальные коллекции
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#999',
              marginBottom: '0'
            }}>
              Выберите коллекцию для прослушивания NFT музыки
            </p>
          </div>

          {loading && (
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: '#fff'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #333',
                borderTop: '3px solid #2AABEE',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p>Загрузка коллекций...</p>
            </div>
          )}

          {error && (
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: '#ff4d4d'
            }}>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && collections.length === 0 && (
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: '#fff'
            }}>
              <p>Коллекции не найдены</p>
            </div>
          )}

          {!loading && !error && collections.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {collections.map((collection) => (
                <motion.div
                  key={collection.address}
                  onClick={() => handleCollectionClick(collection)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#1c1c1c',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    border: '1px solid #333'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#252525';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1c1c1c';
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    backgroundColor: '#333',
                    overflow: 'hidden',
                    marginRight: '16px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={collection.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div style="color: #666; font-size: 12px;">🎵</div>';
                          }
                        }}
                      />
                    ) : (
                      <div style={{ color: '#666', fontSize: '24px' }}>🎵</div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#fff',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {collection.name}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#999',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {collection.description || 'Музыкальная коллекция NFT'}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    marginLeft: '12px'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2AABEE',
                      marginBottom: '2px'
                    }}>
                      {formatListens(collection.totalListens)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      прослушиваний
                    </div>
                  </div>
                </motion.div>
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

export default App;
import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { backendApi } from '../../backend-api';
import { BackendTokenContext } from '../../BackendTokenContext';
import { usePlayer } from '../../contexts/PlayerContext';
import type { NFT } from '../../types/nft';
import '../../App.css';
import { NavBar } from '../NavBar/NavBar';

interface Collection {
  address: string;
  name: string;
  image?: string;
  totalListens: number;
  description?: string;
}

interface NFTWithListens extends NFT {
  listens: number;
}

export default function CollectionPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const collection = location.state?.collection as Collection;
  const wallet = useTonWallet();
  const { token } = useContext(BackendTokenContext);
  const { playNft } = usePlayer();
  
  const [topNfts, setTopNfts] = useState<NFTWithListens[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopNfts = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await backendApi.getTopNftsInCollection(address, 7);
        if (response && response.nfts) {
          // Обогащаем NFT информацией о коллекции
          const enrichedNfts = response.nfts.map(nft => ({
            ...nft,
            collection: {
              name: collection?.name || nft.collection?.name || 'Неизвестная коллекция',
              address: address // Используем адрес из параметров URL
            }
          }));
          
          console.log('📋 Загружены NFT коллекции:', {
            collectionAddress: address,
            collectionName: collection?.name,
            nftsCount: enrichedNfts.length,
            firstNft: enrichedNfts[0]
          });
          
          setTopNfts(enrichedNfts);
        } else {
          setError('Не удалось загрузить NFT коллекции');
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки NFT коллекции:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchTopNfts();
  }, [address, collection?.name]);

  const formatListens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleBackClick = () => {
    navigate('/');
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const handleNftItemClick = async (nft: NFTWithListens) => {
    console.log('🎯 Клик по NFT в коллекции:', {
      name: nft.metadata?.name,
      address: nft.address,
      hasWallet: !!wallet,
      hasToken: !!token,
      collectionAddress: nft.collection?.address
    });

    // Проверяем авторизацию
    if (!wallet || !token) {
      // Показываем сообщение и перенаправляем в Library для аутентификации
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert('Для прослушивания музыки необходимо подключить кошелек в разделе NFT');
      } else {
        alert('Для прослушивания музыки необходимо подключить кошелек в разделе NFT');
      }
      navigate('/library');
      return;
    }

    try {
      // Убеждаемся, что у всех NFT в списке есть правильная информация о коллекции
      const nftsWithCollection = topNfts.map(topNft => ({
        ...topNft,
        collection: {
          name: collection?.name || topNft.collection?.name || 'Неизвестная коллекция',
          address: address! // Используем адрес коллекции из URL
        }
      }));

      console.log('🎵 Запускаем воспроизведение из коллекции:', {
        selectedTrack: nft.metadata?.name,
        totalTracks: nftsWithCollection.length,
        collectionAddress: address,
        allTracksHaveCollection: nftsWithCollection.every(n => n.collection?.address)
      });

      // Передаем правильно обогащенный плейлист в плеер
      await playNft(nft, nftsWithCollection);
      
      // Перенаправляем в Library для отображения плеера
      navigate('/library', { 
        state: { 
          fromCollection: address,
          autoPlaying: true
        } 
      });
      
    } catch (error) {
      console.error('❌ Ошибка при запуске воспроизведения:', error);
      alert('Ошибка при запуске воспроизведения');
    }
    
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  return (
    <div className="app">
      <div className="upper-bar">
        <motion.button
          onClick={handleBackClick}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'absolute',
            left: '12px',
            top: 'calc(var(--safe-area-top) + 12px)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#1c1c1c',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 15
          }}
        >
          <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#fff' }} />
        </motion.button>

        <div className="tonConnectButton">
          <TonConnectButton style={{boxShadow: 'none'}} />
        </div>
        
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(var(--safe-area-top) + 12px)',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: '#fff',
            zIndex: 15,
            maxWidth: '200px'
          }}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {collection?.name || 'Коллекция'}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div style={{ 
          width: '100%', 
          maxWidth: '600px', 
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Информация о коллекции */}
          {collection && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '20px 16px',
              backgroundColor: '#1c1c1c',
              borderRadius: '16px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '12px',
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
                  />
                ) : (
                  <div style={{ color: '#666', fontSize: '32px' }}>🎵</div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#fff',
                  margin: '0 0 8px 0'
                }}>
                  {collection.name}
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#999',
                  margin: '0 0 8px 0'
                }}>
                  {collection.description || 'Музыкальная коллекция NFT'}
                </p>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2AABEE'
                }}>
                  {formatListens(collection.totalListens)} прослушиваний
                </div>
              </div>
            </div>
          )}

          {/* Заголовок топ NFT */}
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
              Топ NFT по прослушиваниям
            </h3>
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
              <p>Загрузка NFT...</p>
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

          {!loading && !error && topNfts.length === 0 && (
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: '#fff'
            }}>
              <p>NFT в коллекции не найдены</p>
            </div>
          )}

          {!loading && !error && topNfts.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '120px'
            }}>
              {topNfts.map((nft, index) => {
                const canPlay = wallet && token;
                // Создаем уникальный ключ для каждого NFT
                const uniqueKey = `${nft.address || 'no-address'}-${nft.index || index}-${address || 'no-collection'}`;
                
                return (
                  <motion.div
                    key={uniqueKey}
                    onClick={() => handleNftItemClick(nft)}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
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
                    {/* Позиция в топе */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: index < 3 ? '#2AABEE' : '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#fff',
                      marginRight: '12px',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>

                    {/* Изображение NFT */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '6px',
                      backgroundColor: '#333',
                      overflow: 'hidden',
                      marginRight: '12px',
                      flexShrink: 0,
                      position: 'relative'
                    }}>
                      {nft.metadata?.image ? (
                        <img
                          src={nft.metadata.image}
                          alt={nft.metadata.name || 'NFT'}
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
                              parent.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">NFT</div>';
                            }
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#999'
                        }}>
                          NFT
                        </div>
                      )}
                      
                      {/* Иконка воспроизведения */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                      className="play-overlay"
                      >
                        <PlayIcon style={{
                          width: '20px',
                          height: '20px',
                          color: canPlay ? '#2AABEE' : '#999',
                          fill: canPlay ? '#2AABEE' : '#999'
                        }} />
                      </div>
                    </div>

                    {/* Информация о NFT */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '2px'
                      }}>
                        {nft.metadata?.name || `NFT #${nft.index || index + 1}`}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#999',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {canPlay ? 'Нажмите для прослушивания' : 'Подключите кошелек для прослушивания'}
                      </div>
                    </div>

                    {/* Количество прослушиваний */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      marginLeft: '12px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2AABEE',
                        marginBottom: '2px'
                      }}>
                        {formatListens(nft.listens)}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#666'
                      }}>
                        прослушиваний
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
          
          .play-overlay {
            transition: opacity 0.2s ease;
          }
          
          div:hover .play-overlay {
            opacity: 1 !important;
          }
        `}
      </style>

    </div>
  );
}
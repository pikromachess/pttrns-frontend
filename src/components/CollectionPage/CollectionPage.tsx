import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { TonConnectButton } from '@tonconnect/ui-react';
import { backendApi } from '../../backend-api';
import { CollectionHeader } from './CollectionHeader';
import { NFTStatItem } from './NFTStatItem';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { NavBar } from '../NavBar/NavBar';
import '../../App.css';
import type { Collection, NFTWithListens } from '../../types/nft';

export default function CollectionPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const collection = location.state?.collection as Collection;
  
  const [nfts, setNfts] = useState<NFTWithListens[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для форматирования количества прослушиваний
  const formatListens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Функция для возврата назад
  const handleBackClick = () => {
    navigate('/');
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  // Загрузка статистики NFT коллекции
  useEffect(() => {
    const fetchCollectionNfts = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('📊 Загружаю статистику NFT для работы:', address);
        
        const response = await backendApi.getCollectionNftsStats(address, 50);
        
        if (response && response.nfts) {
          console.log('✅ Загружены данные статистики:', {
            nfts: response.nfts,
            totalListens: response.nfts.reduce((sum, nft) => sum + nft.listens, 0)
          });
          
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
  }, [address]); // Убрана зависимость collection?.name

  return (
    <div className="app">
      {/* Верхняя панель */}
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
            Статистика коллекции
          </div>
        </div>
      </div>

      {/* Основной контент */}
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
            <CollectionHeader 
              collection={collection} 
              formatListens={formatListens} 
            />
          )}

          {/* Заголовок статистики */}
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

          {/* Состояния загрузки, ошибки и пустого списка */}
          {loading && <LoadingState />}
          {error && <ErrorState error={error} />}
          {!loading && !error && nfts.length === 0 && <EmptyState />}

          {/* Список NFT с статистикой */}
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

      {/* CSS для анимации загрузки */}
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
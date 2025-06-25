import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '../../contexts/PlayerContext';
import { useNFTSearch } from '../../hooks/useNFTSearch';
import { useMusicGeneration } from '../../hooks/useMusicGeneration';
import type { NFT } from '../../types/nft';
import { nftListStyles } from './NFTList.styles';

interface NFTListProps {
  nfts: NFT[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: string | null;
}

export function NFTList({ nfts, loading, error, searchQuery, sortBy }: NFTListProps) {
  const { updatePlaylist } = usePlayer();
  const { filteredNfts } = useNFTSearch(nfts, searchQuery, sortBy);
  const { generatingMusic, handleNftClick } = useMusicGeneration();

  useEffect(() => {
    console.log('Обновляем плейлист в плеере:', filteredNfts.length, 'треков');
    updatePlaylist(filteredNfts);
  }, [filteredNfts, updatePlaylist]);

  if (loading) {
    return (
      <div style={nftListStyles.loadingContainer}>
        <p>Загрузка NFT...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={nftListStyles.errorContainer}>
        <p>Ошибка загрузки NFT: {error}</p>
      </div>
    );
  }

  if (filteredNfts.length === 0) {
    return (
      <div style={nftListStyles.emptyContainer}>
        <p>{searchQuery ? 'NFT по запросу не найдены' : 'NFT не найдены в вашем кошельке'}</p>
      </div>
    );
  }

  return (
    <>
      <div style={nftListStyles.container}>
        {filteredNfts.map((nft, index) => {
          // Создаем уникальный ключ, комбинируя все доступные идентификаторы
          const uniqueKey = `${nft.address || 'no-address'}-${nft.index || index}-${nft.collection?.address || 'no-collection'}`;
          const nftId = nft.address || `${nft.index}`;
          const isGenerating = generatingMusic === nftId;
          
          return (
            <motion.div
              key={uniqueKey}
              onClick={() => {
                console.log('Клик по NFT:', nft.metadata?.name, 'Передаем плейлист из', filteredNfts.length, 'треков');
                handleNftClick(nft, filteredNfts);
              }}
              whileTap={{ scale: 0.98 }}
              style={{
                ...nftListStyles.nftItem,
                backgroundColor: isGenerating ? '#1a1a1a' : '#000',
                cursor: isGenerating ? 'wait' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.backgroundColor = '#1c1c1c';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.backgroundColor = '#000';
                }
              }}
            >
              <div style={nftListStyles.imageContainer}>
                {nft.metadata?.image ? (
                  <img
                    src={nft.metadata.image}
                    alt={nft.metadata.name || 'NFT'}
                    style={nftListStyles.image}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">Нет изображения</div>';
                      }
                    }}
                  />
                ) : (
                  <div style={nftListStyles.noImage}>
                    Нет изображения
                  </div>
                )}
                
                {/* Индикатор загрузки */}
                {isGenerating && (
                  <div style={nftListStyles.loadingOverlay}>
                    <div style={nftListStyles.spinner} />
                  </div>
                )}
              </div>

              <div style={nftListStyles.textContainer}>
                <div style={nftListStyles.title}>
                  {nft.metadata?.name || `NFT #${nft.index || index + 1}`}
                </div>
                <div style={nftListStyles.subtitle}>
                  {nft.collection?.name || 'Без коллекции'}
                  {isGenerating && ' • Генерация музыки...'}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* CSS для анимации загрузки */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}
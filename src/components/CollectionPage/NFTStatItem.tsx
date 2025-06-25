// src/components/CollectionPage/NFTStatItem.tsx
import { motion } from 'framer-motion';

interface NFTWithListens {
  address: string;
  index?: number;
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
  };
  collection?: {
    name?: string;
    address?: string;
  };
  listens: number;
}

interface NFTStatItemProps {
  nft: NFTWithListens;
  index: number;
  formatListens: (count: number) => string;
}

export function NFTStatItem({ nft, index, formatListens }: NFTStatItemProps) {
  return (
    <motion.div
      key={`${nft.address || 'no-address'}-${nft.index || index}`}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#1c1c1c',
        borderRadius: '12px',
        border: '1px solid #333',
        pointerEvents: 'none' // Убираем возможность клика
      }}
    >
      {/* Позиция в рейтинге */}
      <RankBadge position={index + 1} />

      {/* Изображение NFT */}
      <NFTImage nft={nft} />

      {/* Информация о NFT */}
      <NFTInfo nft={nft} index={index} />

      {/* Статистика прослушиваний */}
      <ListenStats listens={nft.listens} formatListens={formatListens} />
    </motion.div>
  );
}

// Компонент для отображения позиции в рейтинге
function RankBadge({ position }: { position: number }) {
  return (
    <div style={{
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: position <= 3 ? '#2AABEE' : '#333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      color: '#fff',
      marginRight: '12px',
      flexShrink: 0
    }}>
      {position}
    </div>
  );
}

// Компонент для отображения изображения NFT
function NFTImage({ nft }: { nft: NFTWithListens }) {
  return (
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '6px',
      backgroundColor: '#333',
      overflow: 'hidden',
      marginRight: '12px',
      flexShrink: 0
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
    </div>
  );
}

// Компонент для отображения информации о NFT
function NFTInfo({ nft, index }: { nft: NFTWithListens; index: number }) {
  return (
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
        Статистика коллекции
      </div>
    </div>
  );
}

// Компонент для отображения статистики прослушиваний
function ListenStats({ listens, formatListens }: { listens: number; formatListens: (count: number) => string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      marginLeft: '12px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: listens > 0 ? '#2AABEE' : '#666',
        marginBottom: '2px'
      }}>
        {formatListens(listens)}
      </div>
      <div style={{
        fontSize: '10px',
        color: '#666'
      }}>
        {listens === 1 ? 'прослушивание' : 'прослушиваний'}
      </div>
    </div>
  );
}
interface Collection {
  address: string;
  name: string;
  image?: string;
  totalListens: number;
  description?: string;
}

interface CollectionHeaderProps {
  collection: Collection;
  formatListens: (count: number) => string;
}

export function CollectionHeader({ collection, formatListens }: CollectionHeaderProps) {
  return (
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
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div style="color: #666; font-size: 32px;">🎵</div>';
              }
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
  );
}
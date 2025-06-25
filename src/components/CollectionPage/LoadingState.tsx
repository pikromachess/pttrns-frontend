// src/components/CollectionPage/LoadingState.tsx
export function LoadingState() {
  return (
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
      <p>Загрузка NFT коллекции...</p>
    </div>
  );
}
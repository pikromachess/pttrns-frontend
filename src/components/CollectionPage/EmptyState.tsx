// src/components/CollectionPage/EmptyState.tsx
export function EmptyState() {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      color: '#fff'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#fff' }}>
        Пока нет данных
      </h3>
      <p style={{ color: '#999', fontSize: '14px' }}>
        NFT из этой коллекции еще не прослушивались
      </p>
    </div>
  );
}
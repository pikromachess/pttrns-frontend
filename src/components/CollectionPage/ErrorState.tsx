// src/components/CollectionPage/ErrorState.tsx
interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      color: '#ff4d4d'
    }}>
      <p>{error}</p>
    </div>
  );
}
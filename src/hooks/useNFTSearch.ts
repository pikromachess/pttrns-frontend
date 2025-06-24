import { useMemo } from 'react';
import type { NFT } from '../types/nft';

export function useNFTSearch(nfts: NFT[], searchQuery: string, sortBy: string | null) {
  const sortedNfts = useMemo(() => {
    return [...nfts].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.metadata?.name || '').localeCompare(b.metadata?.name || '');
      } else if (sortBy === 'index') {
        return (a.index || 0) - (b.index || 0);
      } else if (sortBy === 'collection') {
        return (a.collection?.name || '').localeCompare(b.collection?.name || '');
      }
      return 0;
    });
  }, [nfts, sortBy]);

  const filteredNfts = useMemo(() => {
    if (!searchQuery) return sortedNfts;
    
    return sortedNfts.filter((nft) =>
      nft.metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.collection?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedNfts, searchQuery]);

  return {
    sortedNfts,
    filteredNfts,
  };
}
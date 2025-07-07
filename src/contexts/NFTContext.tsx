import { useState, useRef, createContext, useContext, useCallback } from 'react';
import type { JSX } from 'react';
import { BackendTokenContext } from '../BackendTokenContext';
import { backendApi } from '../backend-api';
import type { NFT, NFTContextType, NFTProviderProps } from '../types/nft';

const NFTContext = createContext<NFTContextType | undefined>(undefined);

export function NFTProvider({ children }: NFTProviderProps): JSX.Element {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [lastWalletAddress, setLastWalletAddress] = useState<string | null>(null);
  const cache = useRef<Map<string, NFT[]>>(new Map());
  const { token } = useContext(BackendTokenContext);
  
  // Добавляем ref для отслеживания активных запросов
  const activeRequests = useRef<Set<string>>(new Set());

  const getWalletNetwork = (chain: string): string => {
    if (chain === '-239') return 'mainnet';
    if (chain === '-3') return 'testnet';
    return 'mainnet';
  };

  const fetchNfts = async (walletAddress: string, selectedNetwork: string, forceRefresh = false) => {
    if (!walletAddress || !selectedNetwork) {
      setError('Некорректные параметры запроса');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Необходима авторизация для просмотра NFT');
      setLoading(false);
      return;
    }

    const cacheKey = `${walletAddress}-${selectedNetwork}`;
    
    
    if (activeRequests.current.has(cacheKey)) {      
      return;
    }
    
    if (!forceRefresh && cache.current.has(cacheKey)) {
      const cachedData = cache.current.get(cacheKey);
      if (cachedData) {
        setNfts(cachedData);
      }
      if (loading) setLoading(false);
      return;
    }

    // Добавляем запрос в активные
    activeRequests.current.add(cacheKey);
    setLoading(true);
    setError(null);
    
    try {      
      const data = await backendApi.getNFTs(token, walletAddress, selectedNetwork, 100, 0);
      
      if (!data) {
        throw new Error('Не удалось получить данные NFT');
      }
      
      const processedNfts = Array.isArray(data.data?.nft_items) 
        ? data.data.nft_items.map((nft: any) => ({
            address: nft.address || '',
            index: nft.index || 0,
            metadata: nft.metadata || {},
            collection: nft.collection || {},
            attributes: nft.attributes || [],
            trust: nft.trust || 'unknown',
          })) 
        : [];

      cache.current.set(cacheKey, processedNfts);
      setNfts(processedNfts);
      
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('403')) {
          setError('Ошибка авторизации. Переподключите кошелек');
        } else if (err.message.includes('timeout')) {
          setError('Превышено время ожидания запроса');
        } else {
          setError(`Ошибка загрузки: ${err.message}`);
        }
      } else {
        setError('Неизвестная ошибка');
      }
    } finally {
      setLoading(false);
      // Удаляем запрос из активных
      activeRequests.current.delete(cacheKey);
    }
  };

  const refreshNfts = async (walletAddress: string, selectedNetwork: string) => {
    if (walletAddress && selectedNetwork) {
      try {
        await fetchNfts(walletAddress, selectedNetwork, true);
        // ✅ Кеш обновится только при успешном запросе
      } catch (error) {
        console.error('Ошибка обновления NFT:', error);
        // Кеш остается нетронутым при ошибке
      }
    }
  };

  const loadNftsForWallet = useCallback(async (walletAddress: string, chain: string) => {
    if (!walletAddress || !chain || !token) {
      setNfts([]);
      if (!token) {
        setError('Необходима авторизация для просмотра NFT');
      } else {
        setError(null);
      }
      setNetwork(null);
      setLastWalletAddress(null);
      setLoading(false);
      return;
    }

    const detectedNetwork = getWalletNetwork(chain);
    const cacheKey = `${walletAddress}-${detectedNetwork}`;
    
    console.log('🔍 loadNftsForWallet вызван:', {
      walletAddress,
      chain,
      detectedNetwork,
      lastWalletAddress,
      currentNetwork: network,
      hasToken: !!token,
      cacheKey,
      hasCachedData: cache.current.has(cacheKey)
    });
    
    // ИСПРАВЛЕНИЕ: Обновляем состояние сразу
    setNetwork(detectedNetwork);
    setLastWalletAddress(walletAddress);
    
    // ИСПРАВЛЕНИЕ: Всегда загружаем данные при смене кошелька
    const walletChanged = lastWalletAddress !== walletAddress || network !== detectedNetwork;
    
    if (walletChanged || !cache.current.has(cacheKey)) {
      console.log('🔄 Загружаем NFT - кошелек изменился или нет кеша');
      await fetchNfts(walletAddress, detectedNetwork);
    } else {
      // Используем кешированные данные
      const cachedNfts = cache.current.get(cacheKey);
      if (cachedNfts) {
        console.log('📦 Используем кешированные NFT:', cachedNfts.length);
        setNfts(cachedNfts);
      }
      setLoading(false);
      setError(null);
    }
  }, [token, lastWalletAddress, network]);

  const value: NFTContextType = {
    nfts,
    loading,
    error,
    network,
    lastWalletAddress,
    loadNftsForWallet,
    refreshNfts
  };

  return (
    <NFTContext.Provider value={value}>
      {children}
    </NFTContext.Provider>
  );
}

export const useNFT = (): NFTContextType => {
  const context = useContext(NFTContext);
  if (!context) {
    throw new Error('useNFT must be used within NFTProvider');
  }
  return context;
};
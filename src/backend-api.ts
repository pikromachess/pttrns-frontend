import type {Account, CHAIN, TonProofItemReplySuccess} from "@tonconnect/ui-react";
import type { NFTResponse, Collection, NFTWithListens, NFTStatsResponse } from "./types/nft";


export const baseUrl = 'https://pttrns-backend-ts.vercel.app'; 
// export const baseUrl = 'http://localhost:3000'; 

export class BackendApi {
    // Добавляем свойство для доступа к baseUrl
    public baseUrl = baseUrl;

    async generatePayload(): Promise<string | undefined> {
        try {
            const response = await (await fetch(`${baseUrl}/ton-proof/generatePayload`, {
                method: 'POST'
            })).json();
            return response.payload;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    async checkProof(account: Account, proof: TonProofItemReplySuccess['proof']): Promise<string | undefined> {
        try {
            const body = {
                address: account.address,
                network: account.chain,
                proof: {
                    ...proof,
                    state_init: account.walletStateInit
                }
            }
            const response = await (await fetch(`${baseUrl}/ton-proof/checkProof`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })).json();
            return response.token;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    async getAccountInfo(authToken: string, network: CHAIN) {
        try {
            const response = await (await fetch(`${baseUrl}/dapp/getAccountInfo?network=${network}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            })).json();
            return response;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    async getNFTs(authToken: string, walletAddress: string, network: string, limit: number = 100, offset: number = 0): Promise<NFTResponse | undefined> {
        try {
            const params = new URLSearchParams({
                walletAddress,
                network,
                limit: limit.toString(),
                offset: offset.toString()
            });
            const response = await fetch(`${baseUrl}/dapp/getNFTs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json() as NFTResponse;
        } catch (e) {
            console.error('Ошибка при получении NFT:', e);
            throw e;
        }
    }

    async generateMusicApiKey(authToken: string): Promise<{apiKey: string, expiresAt: string, musicServerUrl: string} | undefined> {
        try {
            const response = await fetch(`${baseUrl}/dapp/generateMusicApiKey`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Ошибка при генерации музыкального API ключа:', e);
            return undefined;
        }
    }

    async getCollections(): Promise<{collections: Collection[]} | undefined> {
        try {
            const response = await fetch(`${baseUrl}/api/collections`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Ошибка при получении коллекций:', e);
            return undefined;
        }
    }

    async getTopNftsInCollection(collectionAddress: string, limit: number = 7): Promise<{nfts: NFTWithListens[]} | undefined> {
        try {
            const response = await fetch(`${baseUrl}/api/collections/${collectionAddress}/top-nfts?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Ошибка при получении топ NFT коллекции:', e);
            return undefined;
        }
    }

    async getCollectionNftsStats(collectionAddress: string, limit: number = 100, offset: number = 0): Promise<NFTStatsResponse | undefined> {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });
            const response = await fetch(`${baseUrl}/api/collections/${collectionAddress}/nfts-stats?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json() as NFTStatsResponse;
        } catch (e) {
            console.error('Ошибка при получении статистики NFT коллекции:', e);
            return undefined;
        }
    }

    // ИСПРАВЛЕННАЯ функция для записи прослушивания
    async recordListen(nftAddress: string, collectionAddress: string): Promise<boolean> {
        try {
            console.log('📊 Отправляем запрос на запись прослушивания (legacy API):', {
                nftAddress,
                collectionAddress,
                url: `${baseUrl}/api/listens`
            });

            const response = await fetch(`${baseUrl}/api/listens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nftAddress,
                    collectionAddress
                })
            });

            if (!response.ok) {
                console.error('❌ Ошибка записи прослушивания:', response.status, await response.text());
                return false;
            }

            const result = await response.json();
            console.log('✅ Прослушивание записано через legacy API:', result);
            return true;

        } catch (e) {
            console.error('❌ Критическая ошибка при записи прослушивания:', e);
            return false;
        }
    }

    async getStats(): Promise<{totalNftsListened: number, totalListens: number, totalCollections: number} | undefined> {
        try {
            const response = await fetch(`${baseUrl}/api/stats`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Ошибка при получении статистики:', e);
            return undefined;
        }
    }

    async getSyncStatus(): Promise<any | undefined> {
        try {
            const response = await fetch(`${baseUrl}/api/sync-status`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Ошибка при получении статуса синхронизации:', e);
            return undefined;
        }
    }
}

export const backendApi = new BackendApi();
import type {Account, CHAIN, TonProofItemReplySuccess} from "@tonconnect/ui-react";
import type { NFTResponse, Collection, NFTWithListens, NFTStatsResponse } from "./types/nft";

export class BackendApi {
    baseUrl = 'https://pttrns-backend-ts.vercel.app'; 
    

    async generatePayload(): Promise<string | undefined> {
        try {
            const response = await (await fetch(`${this.baseUrl}/ton-proof/generatePayload`, {
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
            const response = await (await fetch(`${this.baseUrl}/ton-proof/checkProof`, {
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
            const response = await (await fetch(`${this.baseUrl}/dapp/getAccountInfo?network=${network}`, {
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
            const response = await fetch(`${this.baseUrl}/dapp/getNFTs?${params}`, {
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
            const response = await fetch(`${this.baseUrl}/dapp/generateMusicApiKey`, {
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
            const response = await fetch(`${this.baseUrl}/api/collections`, {
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
            const response = await fetch(`${this.baseUrl}/api/collections/${collectionAddress}/top-nfts?limit=${limit}`, {
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
            const response = await fetch(`${this.baseUrl}/api/collections/${collectionAddress}/nfts-stats?${params}`, {
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

    async recordListen(nftAddress: string, collectionAddress: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/listens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nftAddress,
                    collectionAddress
                })
            });
            return response.ok;
        } catch (e) {
            console.error('Ошибка при записи прослушивания:', e);
            return false;
        }
    }

    async getStats(): Promise<{totalNftsListened: number, totalListens: number, totalCollections: number} | undefined> {
        try {
            const response = await fetch(`${this.baseUrl}/api/stats`, {
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
            const response = await fetch(`${this.baseUrl}/api/sync-status`, {
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
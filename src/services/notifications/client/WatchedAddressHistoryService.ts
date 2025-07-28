import { watchAddressLogger } from '@/lib/Logger';
import { StorageService } from '@/services/core/StorageService';

/**
 * Service for managing watched address balance history
 * Acts as a facade for StorageService to provide backward compatibility
 */
export class WatchedAddressHistoryService {
  /**
   * Get all stored balances
   */
  public static async getAllBalances(): Promise<Record<string, number>> {
    try {
      return await StorageService.getAllWatchedAddressBalances();
    } catch (error) {
      watchAddressLogger.error('Error getting all watched address balances:', error);
      return {};
    }
  }

  /**
   * Get balance for specific address
   */
  public static async getBalance(address: string): Promise<number | null> {
    try {
      return await StorageService.getWatchedAddressBalance(address);
    } catch (error) {
      watchAddressLogger.error(`Error getting balance for address ${address}:`, error);
      return null;
    }
  }

  /**
   * Update balance for an address
   */
  public static async updateBalance(address: string, balance: number): Promise<void> {
    try {
      await StorageService.updateWatchedAddressBalance(address, balance);
    } catch (error) {
      watchAddressLogger.error(`Error updating balance for address ${address}:`, error);
    }
  }

  /**
   * Update multiple balances at once
   */
  public static async updateBalances(balances: Record<string, number>): Promise<void> {
    try {
      await StorageService.updateWatchedAddressBalances(balances);
    } catch (error) {
      watchAddressLogger.error('Error updating multiple balances:', error);
    }
  }
}

export default WatchedAddressHistoryService;

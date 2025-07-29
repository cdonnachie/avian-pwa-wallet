import { ElectrumService } from '@/services/core/ElectrumService';
import { electrumLogger } from '@/lib/Logger';

/**
 * Bridge adapter that uses the existing ElectrumService implementation
 * but provides the API expected by the WatchAddressService
 */
export class ElectrumBridge {
  private static instance: ElectrumBridge;
  private service: ElectrumService;
  private addressCallbacks: Map<string, Array<(status: string) => void>> = new Map();
  private isInitialized = false;

  private constructor() {
    this.service = new ElectrumService();
    this.init();
  }

  public static getInstance(): ElectrumBridge {
    if (!ElectrumBridge.instance) {
      ElectrumBridge.instance = new ElectrumBridge();
    }
    return ElectrumBridge.instance;
  }

  /**
   * Initialize the ElectrumService
   */
  private async init(): Promise<void> {
    try {
      if (!this.isInitialized) {
        // First select the best server
        await this.service.selectBestServer();

        // Then connect to it
        await this.service.connect();

        this.isInitialized = true;
      }
    } catch (error) {
      electrumLogger.error('Failed to initialize ElectrumBridge:', error);
    }
  }

  /**
   * Ensure connection to the ElectrumService
   * If reconnecting, reestablish any active subscriptions
   */
  private async ensureConnected(): Promise<void> {
    try {
      const wasConnected = this.isInitialized;

      if (!this.isInitialized) {
        await this.init();
      } else if (!this.service.isConnectedToServer()) {
        electrumLogger.info('Reconnecting to Electrum server...');
        await this.service.connect();

        // If we were previously initialized and have active subscriptions,
        // we need to reestablish them after reconnecting
        if (wasConnected && this.addressCallbacks.size > 0) {
          await this.reestablishSubscriptions();
        }
      }
    } catch (error) {
      electrumLogger.error('Failed to ensure ElectrumService connection:', error);
    }
  }

  /**
   * Reestablishes all active subscriptions after reconnecting or changing servers
   */
  private async reestablishSubscriptions(): Promise<void> {
    electrumLogger.info(`Reestablishing ${this.addressCallbacks.size} address subscriptions...`);

    // Process subscriptions in small batches to avoid overwhelming the server
    const addresses = Array.from(this.addressCallbacks.keys());
    const batchSize = 5;

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      // Process each address in the batch
      await Promise.all(
        batch.map(async (address) => {
          try {
            const callbacks = this.addressCallbacks.get(address);
            if (!callbacks || callbacks.length === 0) return;

            // Create a combined callback that will notify all registered callbacks
            const combinedCallback = (status: string) => {
              callbacks.forEach((cb) => {
                try {
                  cb(status);
                } catch (err) {
                  electrumLogger.error('Error in reestablished subscription callback:', err);
                }
              });
            };

            // Resubscribe through the ElectrumService
            electrumLogger.debug(`Resubscribing to address: ${address}`);
            await this.service.subscribeToAddress(address, combinedCallback);
          } catch (error) {
            electrumLogger.error(
              `Failed to reestablish subscription for address ${address}:`,
              error,
            );
          }
        }),
      );

      // Small delay between batches to not overload the server
      if (i + batchSize < addresses.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    electrumLogger.info('Address subscriptions reestablished');
  }

  /**
   * Subscribes to address status changes
   * @param address - The address to subscribe to
   * @param callback - Function to call when status changes, receives status string
   */
  public async subscribeToAddress(
    address: string,
    callback: (status: string) => void,
  ): Promise<boolean> {
    try {
      await this.ensureConnected();

      // Keep track of callbacks for this address
      if (!this.addressCallbacks.has(address)) {
        this.addressCallbacks.set(address, []);

        // Add a subscription through the ElectrumService
        await this.service.subscribeToAddress(address, (status: string) => {
          const callbacks = this.addressCallbacks.get(address);
          if (callbacks) {
            callbacks.forEach((cb) => {
              try {
                cb(status);
              } catch (err) {
                electrumLogger.error('Error in subscription callback:', err);
              }
            });
          }
        });
      }

      // Add this callback to our list
      this.addressCallbacks.get(address)?.push(callback);

      return true;
    } catch (error) {
      electrumLogger.error('Error subscribing to address:', error);
      return false;
    }
  }

  /**
   * Unsubscribes from address status changes
   */
  public unsubscribeFromAddress(address: string): void {
    try {
      // Remove the callback
      this.addressCallbacks.delete(address);

      // Unsubscribe from the ElectrumService
      if (this.service.isConnectedToServer()) {
        this.service.unsubscribeFromAddress(address);
      }
    } catch (error) {
      electrumLogger.error('Error unsubscribing from address:', error);
    }
  }

  /**
   * Gets the balance for an address
   */
  public async getAddressBalance(address: string): Promise<number> {
    try {
      await this.ensureConnected();

      // Get balance using the ElectrumService
      const balanceSatoshis = await this.service.getBalance(address, true);

      // Convert to AVN units (satoshis / 100000000)
      return balanceSatoshis / 100000000;
    } catch (error) {
      electrumLogger.error('Error getting address balance:', error);
      return 0;
    }
  }

  /**
   * Gets the transaction history for an address
   */
  public async getAddressHistory(address: string): Promise<any[]> {
    try {
      await this.ensureConnected();

      // Get history using the ElectrumService
      return await this.service.getTransactionHistory(address);
    } catch (error) {
      electrumLogger.error('Error getting address history:', error);
      return [];
    }
  }

  /**
   * Change the ElectrumX server while preserving subscriptions
   * @param serverIndex - Index of the server to connect to
   * @returns True if successful, false otherwise
   */
  public async changeServer(serverIndex: number): Promise<boolean> {
    try {
      electrumLogger.info(`Changing ElectrumX server to index ${serverIndex}...`);

      // Get current subscription state
      const hasSubscriptions = this.addressCallbacks.size > 0;

      // Disconnect without clearing callbacks
      this.disconnect(false);

      // Change the server
      this.service.selectServer(serverIndex);

      // Connect to the new server
      await this.service.connect();
      this.isInitialized = true;

      // If we had subscriptions, reestablish them
      if (hasSubscriptions) {
        await this.reestablishSubscriptions();
      }

      electrumLogger.info(`Successfully changed to server: ${this.service.getServerUrl()}`);
      return true;
    } catch (error) {
      electrumLogger.error('Failed to change ElectrumX server:', error);
      return false;
    }
  }

  /**
   * Disconnects from the ElectrumX server
   * @param clearCallbacks - Whether to clear the address callbacks (default: true)
   */
  public disconnect(clearCallbacks: boolean = true): void {
    try {
      if (this.isInitialized && this.service.isConnectedToServer()) {
        this.service.disconnect();
        this.isInitialized = false;

        // Only clear callbacks if explicitly requested
        if (clearCallbacks) {
          this.addressCallbacks.clear();
        }
      }
    } catch (error) {
      electrumLogger.error('Error disconnecting from ElectrumX:', error);
    }
  }

  /**
   * Converts an address to script hash for ElectrumX protocol
   */
  public addressToScriptHash(address: string): string {
    return this.service.addressToScriptHash(address);
  }
}

export default ElectrumBridge;

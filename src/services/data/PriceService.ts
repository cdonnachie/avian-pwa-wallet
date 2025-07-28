/**
 * Service to handle price data fetching with rate limiting
 * Uses CoinGecko API with proper throttling to avoid hitting rate limits
 */

import { NotificationType } from '../notifications/NotificationTypes';
import { priceLogger } from '@/lib/Logger';

// Store the last price fetch time and value
let lastPriceFetch: {
  timestamp: number;
  price: number;
} | null = null;

// Track in-flight price fetch requests to prevent duplicate calls
let currentFetchPromise: Promise<PriceData | null> | null = null;

// Minimum interval between API calls (in ms)
// CoinGecko free API has ~10-30 calls/minute limit
const MIN_FETCH_INTERVAL = 60000; // 1 minute

export interface PriceData {
  price: number;
  change24h: number;
  lastUpdated: Date;
}

export interface NotificationMessage {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: any;
}

export class PriceService {
  /**
   * Fetch AVN price from CoinGecko with rate limiting
   * Implements request deduplication to avoid multiple simultaneous calls
   */
  public static async getAvnPrice(forceFresh = false): Promise<PriceData | null> {
    const now = Date.now();

    // Check if we've already fetched within the rate limit window
    if (!forceFresh && lastPriceFetch && now - lastPriceFetch.timestamp < MIN_FETCH_INTERVAL) {
      priceLogger.debug('Using cached price data within rate limit window');

      // Return cached data
      return {
        price: lastPriceFetch.price,
        change24h: 0, // We don't store the change in cache
        lastUpdated: new Date(lastPriceFetch.timestamp),
      };
    }

    // If there's already a fetch in progress, return that promise instead of starting a new one
    if (currentFetchPromise) {
      priceLogger.debug('Reusing in-flight price fetch request');
      return currentFetchPromise;
    }

    // Check for stored price in local storage as backup
    const storedPrice = this.getLastKnownPrice();

    // Create a new fetch promise and store it
    currentFetchPromise = this.fetchPriceData();
    return currentFetchPromise;
  }

  /**
   * Internal method to fetch price data from CoinGecko
   * This is separated to allow for request deduplication
   */
  private static async fetchPriceData(): Promise<PriceData | null> {
    const now = Date.now();
    const storedPrice = this.getLastKnownPrice();

    try {
      // Set a timeout for the fetch operation to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

      priceLogger.debug('Fetching price from CoinGecko API');

      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=avian-network&vs_currencies=usd&include_24hr_change=true',
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data['avian-network']) {
        throw new Error('AVN price data not found in API response');
      }

      const price = data['avian-network'].usd;
      const change24h = data['avian-network'].usd_24h_change || 0;

      // Update cache
      lastPriceFetch = {
        timestamp: now,
        price: price,
      };

      // Also update localStorage for persistence across sessions
      this.saveLastKnownPrice(price);

      priceLogger.info(`Updated AVN price: $${price.toFixed(8)}, change: ${change24h.toFixed(2)}%`);

      return {
        price,
        change24h,
        lastUpdated: new Date(),
      };
    } catch (error) {
      // Check if this was an abort error from our timeout
      if (error instanceof Error && error.name === 'AbortError') {
        priceLogger.warn('Price fetch request timed out after 8 seconds');
      } else {
        priceLogger.error('Error fetching AVN price:', error);
      }

      // First try in-memory cache
      if (lastPriceFetch) {
        priceLogger.info('Using in-memory cached price data as fallback');
        return {
          price: lastPriceFetch.price,
          change24h: 0,
          lastUpdated: new Date(lastPriceFetch.timestamp),
        };
      }

      // Then try localStorage backup
      if (storedPrice) {
        priceLogger.info('Using localStorage price data as fallback');
        // Update in-memory cache with localStorage data
        lastPriceFetch = {
          timestamp: storedPrice.timestamp,
          price: storedPrice.price,
        };
        return {
          price: storedPrice.price,
          change24h: 0,
          lastUpdated: new Date(storedPrice.timestamp),
        };
      }

      // If we have no cached or stored price data, return null
      // This allows the UI to handle the absence of price data appropriately
      priceLogger.warn('No price data available, returning null');
      return null;
    } finally {
      // Clear the current fetch promise to allow future fetches
      currentFetchPromise = null;
    }
  }

  /**
   * Check if a price change warrants a notification based on threshold
   */
  public static shouldNotifyPriceChange(
    oldPrice: number,
    newPrice: number,
    threshold: number,
  ): boolean {
    if (!oldPrice || !newPrice) return false;

    const percentChange = Math.abs(((newPrice - oldPrice) / oldPrice) * 100);
    return percentChange >= threshold;
  }

  /**
   * Create a price alert notification
   */
  public static createPriceNotification(oldPrice: number, newPrice: number): NotificationMessage {
    const percentChange = ((newPrice - oldPrice) / oldPrice) * 100;
    const direction = percentChange >= 0 ? 'up' : 'down';

    return {
      type: 'price_alert',
      title: `AVN Price ${direction === 'up' ? 'Up' : 'Down'} ${Math.abs(percentChange).toFixed(2)}%`,
      body: `AVN price is now $${newPrice.toFixed(8)} (${direction === 'up' ? '+' : ''}${percentChange.toFixed(2)}%)`,
      icon: '/icons/icon-192x192.png',
      data: {
        price: newPrice,
        change: percentChange,
      },
    };
  }

  /**
   * Store the last price in localStorage to track changes between sessions
   */
  public static saveLastKnownPrice(price: number): void {
    try {
      localStorage.setItem(
        'lastKnownPrice',
        JSON.stringify({
          price,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      priceLogger.error('Error saving last known price:', error);
    }
  }

  /**
   * Get the last known price from localStorage
   */
  public static getLastKnownPrice(): { price: number; timestamp: number } | null {
    try {
      const data = localStorage.getItem('lastKnownPrice');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      priceLogger.error('Error getting last known price:', error);
      return null;
    }
  }

  /**
   * Background periodic price check for PWA
   * This can be called by a service worker periodically
   */
  public static async checkPriceInBackground(
    threshold: number,
    priceAlertsEnabled: boolean = true,
  ): Promise<NotificationMessage | null> {
    // If price alerts are explicitly disabled, don't send notifications
    if (priceAlertsEnabled === false) return null;

    const lastKnownPrice = this.getLastKnownPrice();
    if (!lastKnownPrice) return null;

    const currentPrice = await this.getAvnPrice();
    if (!currentPrice) return null;

    if (this.shouldNotifyPriceChange(lastKnownPrice.price, currentPrice.price, threshold)) {
      this.saveLastKnownPrice(currentPrice.price);
      return this.createPriceNotification(lastKnownPrice.price, currentPrice.price);
    }

    return null;
  }
}

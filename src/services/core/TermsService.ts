import { StorageService } from './StorageService';
import { TermsAcceptance } from '../../types/security';
import { termsLogger } from '@/lib/Logger';

export class TermsService {
  private static instance: TermsService | null = null;
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly STORAGE_KEY = 'terms_acceptance';

  static getInstance(): TermsService {
    if (!TermsService.instance) {
      TermsService.instance = new TermsService();
    }
    return TermsService.instance;
  }

  async hasAcceptedCurrentTerms(): Promise<boolean> {
    try {
      termsLogger.debug('Checking terms acceptance status');
      const settings = await StorageService.getSettings();
      const termsData = settings?.[this.STORAGE_KEY] as TermsAcceptance;

      if (!termsData) {
        termsLogger.debug('No terms acceptance data found');
        return false;
      }

      const isAccepted = termsData.accepted && termsData.version === this.CURRENT_VERSION;
      termsLogger.debug(
        `Terms acceptance check: ${isAccepted ? 'accepted' : 'not accepted'}, version: ${termsData.version}`,
      );
      return isAccepted;
    } catch (error) {
      termsLogger.error('Failed to check terms acceptance:', error);
      return false;
    }
  }

  async acceptTerms(): Promise<void> {
    try {
      termsLogger.debug(`User accepting terms version ${this.CURRENT_VERSION}`);
      const termsAcceptance: TermsAcceptance = {
        accepted: true,
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      };

      const settings = await StorageService.getSettings();
      await StorageService.setSettings({
        ...settings,
        [this.STORAGE_KEY]: termsAcceptance,
      });
      termsLogger.debug('Terms acceptance saved successfully');
    } catch (error) {
      termsLogger.error('Failed to accept terms:', error);
      throw error;
    }
  }

  async getTermsAcceptance(): Promise<TermsAcceptance | null> {
    try {
      termsLogger.debug('Getting terms acceptance data');
      const settings = await StorageService.getSettings();
      const termsData = (settings?.[this.STORAGE_KEY] as TermsAcceptance) || null;
      termsLogger.debug(
        `Terms data retrieved: ${termsData ? `version ${termsData.version}, accepted: ${termsData.accepted}` : 'not found'}`,
      );
      return termsData;
    } catch (error) {
      termsLogger.error('Failed to get terms acceptance:', error);
      return null;
    }
  }

  getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }
}

export const termsService = TermsService.getInstance();

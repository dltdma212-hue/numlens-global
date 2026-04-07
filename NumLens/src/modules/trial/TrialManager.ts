import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIAL_LIMIT = 5;
const STORAGE_KEY = '@numlens/trial_count';
const SUBSCRIPTION_KEY = '@numlens/is_subscribed';

/**
 * NumLens Trial Manager
 * Tracks free calculations and subscription status.
 * Anti-gravity philosophy: Simple but scalable.
 */
export class TrialManager {
  /**
   * Checks if the user is allowed to perform a calculation.
   */
  static async checkAccess(): Promise<boolean> {
    const isSubscribed = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (isSubscribed === 'true') return true;

    const currentCount = await this.getTrialCount();
    return currentCount < TRIAL_LIMIT;
  }

  /**
   * Increments the trial count after a successful calculation.
   */
  static async incrementTrial(): Promise<void> {
    const isSubscribed = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (isSubscribed === 'true') return;

    const currentCount = await this.getTrialCount();
    await AsyncStorage.setItem(STORAGE_KEY, (currentCount + 1).toString());
  }

  /**
   * Retrieves the current trial usage count.
   */
  static async getTrialCount(): Promise<number> {
    const count = await AsyncStorage.getItem(STORAGE_KEY);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Resets or sets subscription status (for testing/real payment).
   */
  static async setSubscribed(status: boolean): Promise<void> {
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, status.toString());
  }
}

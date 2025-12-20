// Singleton sync manager to prevent multiple concurrent syncs
import { syncToSupabase, pullFromSupabase, getSyncStatus } from './transactionService';

class SyncManager {
  private isSyncing = false;
  private hasRunInitialSync = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: { total: number; synced: number; unsynced: number }) => void> = new Set();

  // Subscribe to sync status updates
  subscribe(callback: (status: { total: number; synced: number; unsynced: number }) => void) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of sync status change
  private async notifyListeners() {
    const status = await getSyncStatus();
    this.listeners.forEach(callback => callback(status));
  }

  // Run initial sync (only once)
  async runInitialSync() {
    if (this.hasRunInitialSync) {
      console.log('Initial sync already completed, skipping');
      return;
    }

    if (this.isSyncing) {
      console.log('Sync already in progress, skipping initial sync');
      return;
    }

    this.hasRunInitialSync = true;

    if (navigator.onLine) {
      this.isSyncing = true;
      console.log('Initial sync: Pulling from Supabase...');
      await pullFromSupabase();
      console.log('Initial sync: Syncing to Supabase...');
      await syncToSupabase();
      await this.notifyListeners();
      this.isSyncing = false;
    }
  }

  // Manual sync trigger
  async sync() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    console.log('Manual sync triggered');
    await syncToSupabase();
    await this.notifyListeners();
    this.isSyncing = false;
  }

  // Start background sync interval
  startAutoSync() {
    if (this.syncInterval) {
      console.log('Auto-sync already running');
      return;
    }

    console.log('Starting auto-sync...');

    // Periodic sync check every 5 seconds
    this.syncInterval = setInterval(async () => {
      if (this.isSyncing) return;

      const status = await getSyncStatus();
      this.listeners.forEach(callback => callback(status));

      // If there are unsynced items and we're online, try to sync
      if (status.unsynced > 0 && navigator.onLine) {
        this.isSyncing = true;
        console.log(`Auto-sync: ${status.unsynced} unsynced transactions`);
        await syncToSupabase();
        await this.notifyListeners();
        this.isSyncing = false;
      }
    }, 5000);

    // Listen for online events
    const handleOnline = async () => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      console.log('Network status: Online - starting sync...');
      await syncToSupabase();
      await this.notifyListeners();
      this.isSyncing = false;
    };

    window.addEventListener('online', handleOnline);

    // Store cleanup function
    this._cleanup = () => {
      window.removeEventListener('online', handleOnline);
    };
  }

  private _cleanup: (() => void) | null = null;

  // Stop background sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }

    console.log('Auto-sync stopped');
  }

  // Get current sync status
  async getStatus() {
    return await getSyncStatus();
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

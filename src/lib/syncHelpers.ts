// Global sync helper functions for manual troubleshooting
// These functions are available in the browser console

import { pullFromSupabase, syncToSupabase } from '@/services/transactionService';

// Pull all data from Supabase to local IndexedDB
async function syncFromCloud() {
  console.log('🔄 Starting manual sync from Supabase...');

  try {
    // Pull transactions
    console.log('📥 Pulling transactions...');
    await pullFromSupabase();

    console.log('✅ Sync from cloud complete! Please refresh the page.');
    console.log('💡 Tip: Press Cmd+R (Mac) or Ctrl+R (Windows) to refresh');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// Push all local data to Supabase
async function syncToCloud() {
  console.log('🔄 Starting manual sync to Supabase...');

  try {
    // Push transactions
    console.log('📤 Pushing transactions...');
    await syncToSupabase();

    console.log('✅ Sync to cloud complete!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// Full bi-directional sync
async function fullSync() {
  console.log('🔄 Starting full bi-directional sync...');

  try {
    // First pull from cloud to get latest
    await syncFromCloud();

    // Wait a moment for local DB to update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Then push any local changes
    await syncToCloud();

    console.log('✅ Full sync complete! Please refresh the page.');
  } catch (error) {
    console.error('❌ Full sync failed:', error);
  }
}

// Make available globally
declare global {
  interface Window {
    syncFromCloud: typeof syncFromCloud;
    syncToCloud: typeof syncToCloud;
    fullSync: typeof fullSync;
  }
}

window.syncFromCloud = syncFromCloud;
window.syncToCloud = syncToCloud;
window.fullSync = fullSync;

// Log available commands
console.log('🔧 Sync helpers available:');
console.log('  • window.syncFromCloud() - Pull latest data from Supabase to local app');
console.log('  • window.syncToCloud() - Push local changes to Supabase');
console.log('  • window.fullSync() - Do both (pull then push)');

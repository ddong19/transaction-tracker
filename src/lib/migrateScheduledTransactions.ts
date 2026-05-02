// One-time migration script to add sync fields to existing scheduled transactions
import * as db from './db';

export async function migrateScheduledTransactionsV3() {
  try {
    console.log('Starting migration: Adding sync fields to scheduled transactions...');

    const dbInstance = await (window as any).indexedDB.open('spending-tracker-db', 3);

    return new Promise<void>((resolve, reject) => {
      dbInstance.onerror = () => reject(dbInstance.error);

      dbInstance.onsuccess = async () => {
        const database = dbInstance.result;

        // Check if we need to migrate
        if (!database.objectStoreNames.contains('scheduledTransactions')) {
          console.log('No scheduled transactions store found, skipping migration');
          resolve();
          return;
        }

        const transaction = database.transaction(['scheduledTransactions'], 'readwrite');
        const store = transaction.objectStore('scheduledTransactions');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result;
          console.log(`Found ${records.length} scheduled transactions to migrate`);

          let updated = 0;
          records.forEach((record: any) => {
            // Add sync fields if they don't exist
            if (record.syncedToSupabase === undefined) {
              record.syncedToSupabase = false;
              record.supabaseId = null;
              store.put(record);
              updated++;
            }
          });

          transaction.oncomplete = () => {
            console.log(`Migration complete: Updated ${updated} records`);
            resolve();
          };

          transaction.onerror = () => {
            console.error('Migration failed:', transaction.error);
            reject(transaction.error);
          };
        };

        getAllRequest.onerror = () => {
          console.error('Failed to get records:', getAllRequest.error);
          reject(getAllRequest.error);
        };
      };
    });
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

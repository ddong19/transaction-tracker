// IndexedDB setup for local-first database
// This is the source of truth for transactions

const DB_NAME = 'spending-tracker-db';
const DB_VERSION = 1;
const TRANSACTIONS_STORE = 'transactions';

export interface LocalTransaction {
  id: string; // local UUID
  subcategoryId: number;
  amount: number;
  occurredAt: string; // ISO date string
  notes: string | null;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  syncedToSupabase: boolean; // has this been backed up?
  supabaseId: number | null; // ID from supabase after sync
}

// Open/create the database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create transactions store if it doesn't exist
      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        const store = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });

        // Create indexes for efficient querying
        store.createIndex('occurredAt', 'occurredAt', { unique: false });
        store.createIndex('syncedToSupabase', 'syncedToSupabase', { unique: false });
        store.createIndex('subcategoryId', 'subcategoryId', { unique: false });
      }
    };
  });
}

// Get all transactions from local DB
export async function getAllTransactions(): Promise<LocalTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get transactions for a specific month
export async function getTransactionsByMonth(year: number, month: number): Promise<LocalTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const index = store.index('occurredAt');

    // Create date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add a new transaction to local DB
export async function addTransaction(transaction: Omit<LocalTransaction, 'id' | 'createdAt' | 'updatedAt' | 'syncedToSupabase' | 'supabaseId'>): Promise<LocalTransaction> {
  const db = await openDB();

  const newTransaction: LocalTransaction = {
    ...transaction,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncedToSupabase: false,
    supabaseId: null,
  };

  return new Promise((resolve, reject) => {
    const txn = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = txn.objectStore(TRANSACTIONS_STORE);
    const request = store.add(newTransaction);

    request.onsuccess = () => resolve(newTransaction);
    request.onerror = () => reject(request.error);
  });
}

// Update a transaction
export async function updateTransaction(id: string, updates: Partial<LocalTransaction>): Promise<void> {
  const db = await openDB();

  return new Promise(async (resolve, reject) => {
    const txn = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = txn.objectStore(TRANSACTIONS_STORE);

    // Get existing transaction
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) {
        reject(new Error('Transaction not found'));
        return;
      }

      // Update with new values
      const updated = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Mark transaction as synced to Supabase
export async function markAsSynced(id: string, supabaseId: number): Promise<void> {
  await updateTransaction(id, {
    syncedToSupabase: true,
    supabaseId: supabaseId,
  });
}

// Get unsynced transactions (for background sync)
export async function getUnsyncedTransactions(): Promise<LocalTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      // Filter for unsynced transactions
      const all = request.result as LocalTransaction[];
      const unsynced = all.filter(tx => !tx.syncedToSupabase);
      resolve(unsynced);
    };
    request.onerror = () => reject(request.error);
  });
}

// Delete a transaction
export async function deleteTransaction(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all transactions (for testing/reset)
export async function clearAllTransactions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = transaction.objectStore(TRANSACTIONS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

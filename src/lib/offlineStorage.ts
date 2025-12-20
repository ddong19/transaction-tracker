import { Transaction } from '@/app/types';

const PENDING_TRANSACTIONS_KEY = 'pending-transactions';
const OFFLINE_TRANSACTIONS_KEY = 'offline-transactions';

export interface PendingTransaction {
  localId: string;
  subcategoryId: number;
  amount: number;
  occurredAt: string;
  notes?: string;
  createdAt: number;
}

export interface OfflineTransaction extends Transaction {
  isPending: boolean;
  localId: string;
}

// Store a transaction that needs to be synced
export function addPendingTransaction(transaction: Omit<PendingTransaction, 'localId' | 'createdAt'>) {
  const pending = getPendingTransactions();
  const newTransaction: PendingTransaction = {
    ...transaction,
    localId: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  pending.push(newTransaction);
  localStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
  return newTransaction;
}

// Get all pending transactions
export function getPendingTransactions(): PendingTransaction[] {
  const stored = localStorage.getItem(PENDING_TRANSACTIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Remove a pending transaction after successful sync
export function removePendingTransaction(localId: string) {
  const pending = getPendingTransactions();
  const filtered = pending.filter(t => t.localId !== localId);
  localStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(filtered));
}

// Clear all pending transactions
export function clearPendingTransactions() {
  localStorage.removeItem(PENDING_TRANSACTIONS_KEY);
}

// Store offline transactions for display
export function storeOfflineTransactions(transactions: Transaction[]) {
  localStorage.setItem(OFFLINE_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

// Get offline transactions
export function getOfflineTransactions(): Transaction[] {
  const stored = localStorage.getItem(OFFLINE_TRANSACTIONS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return parsed.map((t: any) => ({
      ...t,
      date: new Date(t.date),
    }));
  } catch {
    return [];
  }
}

// Add an offline transaction for immediate display
export function addOfflineTransaction(transaction: Omit<Transaction, 'id'> & { localId: string }): Transaction {
  const offline = getOfflineTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: transaction.localId,
  };
  offline.unshift(newTransaction);
  storeOfflineTransactions(offline);
  return newTransaction;
}

// Remove offline transaction after successful sync
export function removeOfflineTransaction(localId: string) {
  const offline = getOfflineTransactions();
  const filtered = offline.filter(t => t.id !== localId);
  storeOfflineTransactions(filtered);
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

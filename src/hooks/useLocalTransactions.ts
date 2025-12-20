import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction } from '@/app/types';
import { useCategories } from './useSupabaseData';
import {
  addLocalTransaction,
  getLocalTransactions,
  getLocalTransactionsByMonth,
  localTransactionToTransaction,
} from '@/services/transactionService';
import { syncManager } from '@/services/syncManager';

export function useLocalTransactions(selectedMonth?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });

  const { categories } = useCategories();

  // Memoize category maps to avoid rebuilding on every render
  const { subcategoriesMap, categoriesMap } = useMemo(() => {
    const subMap = new Map();
    const catMap = new Map();

    categories.forEach(cat => {
      catMap.set(cat.id, cat);
      cat.subcategories.forEach(sub => {
        subMap.set(sub.id, sub);
      });
    });

    return { subcategoriesMap: subMap, categoriesMap: catMap };
  }, [categories]);

  // Fetch transactions from local DB (memoized to prevent unnecessary recreations)
  const fetchTransactions = useCallback(async () => {
    // Don't fetch if categories aren't loaded yet
    if (categories.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get transactions from local DB
      let localTransactions;
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        localTransactions = await getLocalTransactionsByMonth(
          parseInt(year),
          parseInt(month)
        );
      } else {
        localTransactions = await getLocalTransactions();
      }

      // Convert to app format
      const appTransactions: Transaction[] = localTransactions
        .map(localTx => {
          const subcategory = subcategoriesMap.get(localTx.subcategoryId);
          if (!subcategory) return null;

          const category = categoriesMap.get(subcategory.category_id);
          if (!category) return null;

          return localTransactionToTransaction(localTx, subcategory, category);
        })
        .filter((tx): tx is Transaction => tx !== null)
        .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date desc

      setTransactions(appTransactions);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, subcategoriesMap, categoriesMap, categories.length]);

  // Load transactions on mount and when month changes (NOT when categories change)
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Subscribe to sync status updates (shared across all hook instances)
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });

    // Get initial status
    syncManager.getStatus().then(setSyncStatus);

    return unsubscribe;
  }, []);

  // Start sync manager only once globally (not per hook instance)
  useEffect(() => {
    if (categories.length > 0) {
      // These methods are idempotent - safe to call multiple times
      syncManager.runInitialSync();
      syncManager.startAutoSync();
    }

    // No cleanup needed - sync manager is a singleton
  }, [categories.length]); // Only trigger when categories go from 0 to >0

  // Add transaction to local DB
  const addTransaction = async (transaction: {
    subcategoryId: number;
    amount: number;
    occurredAt: string;
    notes?: string;
  }) => {
    try {
      // Add to local DB (source of truth)
      await addLocalTransaction(transaction);

      // Refresh transactions
      await fetchTransactions();

      // Notify other hooks that a transaction was added
      window.dispatchEvent(new CustomEvent('transactionAdded'));
    } catch (err) {
      console.error('Error adding transaction:', err);
      throw err;
    }
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
    refetch: fetchTransactions,
    syncStatus,
  };
}

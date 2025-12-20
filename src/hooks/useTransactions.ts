import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { Transaction, dbTransactionToTransaction, DbTransaction, DbCategory, DbSubcategory } from '@/app/types';
import {
  addPendingTransaction,
  getPendingTransactions,
  removePendingTransaction,
  addOfflineTransaction,
  getOfflineTransactions,
  removeOfflineTransaction,
  storeOfflineTransactions,
  isOnline,
} from '@/lib/offlineStorage';
import { useCategories } from './useSupabaseData';

export function useTransactions(selectedMonth?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { categories } = useCategories();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Check if online
      if (!isOnline()) {
        // Load from offline storage
        const offlineTransactions = getOfflineTransactions();
        setTransactions(offlineTransactions);
        setLoading(false);
        return;
      }

      // Fetch categories and subcategories first
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      if (categoriesError) throw categoriesError;

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('user_id', userId);

      if (subcategoriesError) throw subcategoriesError;

      // Create lookup maps
      const categoriesMap = new Map<number, DbCategory>();
      (categoriesData || []).forEach(cat => categoriesMap.set(cat.id, cat));

      const subcategoriesMap = new Map<number, DbSubcategory>();
      (subcategoriesData || []).forEach(sub => subcategoriesMap.set(sub.id, sub));

      // Fetch transactions
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false });

      // Filter by month if provided
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        query = query
          .gte('occurred_at', startDate)
          .lte('occurred_at', endDate);
      }

      const { data: transactionsData, error: txError } = await query;

      if (txError) throw txError;

      // Convert to app format
      const appTransactions: Transaction[] = (transactionsData || [])
        .map((dbTx: DbTransaction) => {
          const subcategory = subcategoriesMap.get(dbTx.subcategory_id);
          if (!subcategory) return null;

          const category = categoriesMap.get(subcategory.category_id);
          if (!category) return null;

          return dbTransactionToTransaction(dbTx, subcategory, category);
        })
        .filter((tx): tx is Transaction => tx !== null);

      setTransactions(appTransactions);

      // Store in offline cache
      storeOfflineTransactions(appTransactions);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching transactions:', err);

      // Fall back to offline storage on error
      const offlineTransactions = getOfflineTransactions();
      if (offlineTransactions.length > 0) {
        setTransactions(offlineTransactions);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // Update pending count
    setPendingCount(getPendingTransactions().length);
  }, [selectedMonth]);

  // Sync pending transactions when coming back online
  useEffect(() => {
    const syncPending = async () => {
      if (!isOnline()) return;

      const pending = getPendingTransactions();
      if (pending.length === 0) return;

      const userId = await getCurrentUserId();
      if (!userId) return;

      for (const pendingTx of pending) {
        try {
          const { error } = await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              local_id: pendingTx.localId,
              subcategory_id: pendingTx.subcategoryId,
              amount: pendingTx.amount,
              occurred_at: pendingTx.occurredAt,
              notes: pendingTx.notes || null,
            });

          if (!error) {
            removePendingTransaction(pendingTx.localId);
            removeOfflineTransaction(pendingTx.localId);
          }
        } catch (err) {
          console.error('Error syncing transaction:', err);
        }
      }

      setPendingCount(getPendingTransactions().length);
      await fetchTransactions();
    };

    window.addEventListener('online', syncPending);
    syncPending(); // Run on mount

    return () => window.removeEventListener('online', syncPending);
  }, []);

  const addTransaction = async (transaction: {
    subcategoryId: number;
    amount: number;
    occurredAt: string;
    notes?: string;
  }) => {
    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Find subcategory and category for offline display
      const subcategory = categories
        .flatMap(c => c.subcategories)
        .find(s => s.id === transaction.subcategoryId);

      const category = categories.find(c =>
        c.subcategories.some(s => s.id === transaction.subcategoryId)
      );

      // If offline, save for later sync
      if (!isOnline()) {
        const pending = addPendingTransaction(transaction);

        // Add to UI immediately
        if (subcategory && category) {
          const offlineTx = addOfflineTransaction({
            localId: pending.localId,
            category: category.name,
            subcategory: subcategory.name,
            amount: transaction.amount,
            date: new Date(transaction.occurredAt),
            note: transaction.notes || '',
          });

          setTransactions(prev => [offlineTx, ...prev]);
        }

        setPendingCount(getPendingTransactions().length);
        return;
      }

      // Online - save directly
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          local_id: crypto.randomUUID(),
          subcategory_id: transaction.subcategoryId,
          amount: transaction.amount,
          occurred_at: transaction.occurredAt,
          notes: transaction.notes || null,
        });

      if (error) throw error;

      // Refetch transactions to get the updated list
      await fetchTransactions();
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
    pendingCount,
    isOffline: !isOnline(),
  };
}

import { useState, useEffect } from 'react';
import { getLocalTransactions } from '@/services/transactionService';
import { parseLocalDate } from '@/lib/dateUtils';

// Lightweight hook to get just the months that have transactions
// This is cached and only refetches when transactions change
export function useAllTransactionMonths() {
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    async function fetchMonths() {
      try {
        const localTx = await getLocalTransactions();

        const monthsSet = new Set<string>();

        // Add current month
        const now = new Date();
        monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

        // Add months from transactions
        localTx.forEach(tx => {
          const date = parseLocalDate(tx.occurredAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(month);
        });

        // Sort in descending order (newest first)
        const sortedMonths = Array.from(monthsSet).sort().reverse();
        setMonths(sortedMonths);
      } catch (err) {
        console.error('Error fetching transaction months:', err);
      }
    }

    fetchMonths();

    // Listen for storage events (transactions added/changed)
    const handleStorageChange = () => {
      fetchMonths();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event when transactions are added
    window.addEventListener('transactionAdded', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('transactionAdded', handleStorageChange);
    };
  }, []);

  return months;
}

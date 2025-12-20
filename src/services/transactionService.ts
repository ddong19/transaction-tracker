import { logger } from '@/lib/logger';
// Transaction service that manages local DB and Supabase sync
import * as db from '@/lib/db';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { Transaction, DbCategory, DbSubcategory } from '@/app/types';
import { parseLocalDate } from '@/lib/dateUtils';

// Convert local transaction to app transaction format
export function localTransactionToTransaction(
  localTx: db.LocalTransaction,
  subcategory: DbSubcategory,
  category: DbCategory
): Transaction {
  return {
    id: localTx.id,
    category: category.name,
    subcategory: subcategory.name,
    amount: Number(localTx.amount),
    date: parseLocalDate(localTx.occurredAt), // Use local date parser to avoid timezone issues
    note: localTx.notes || '',
  };
}

// Add transaction to local DB (source of truth)
export async function addLocalTransaction(transaction: {
  subcategoryId: number;
  amount: number;
  occurredAt: string;
  notes?: string;
}): Promise<db.LocalTransaction> {
  const localTx = await db.addTransaction({
    subcategoryId: transaction.subcategoryId,
    amount: transaction.amount,
    occurredAt: transaction.occurredAt,
    notes: transaction.notes || null,
  });

  // Trigger background sync (non-blocking)
  syncToSupabase().catch(err => logger.error('Background sync failed:', err));

  return localTx;
}

// Get all local transactions
export async function getLocalTransactions(): Promise<db.LocalTransaction[]> {
  return await db.getAllTransactions();
}

// Get local transactions by month
export async function getLocalTransactionsByMonth(
  year: number,
  month: number
): Promise<db.LocalTransaction[]> {
  return await db.getTransactionsByMonth(year, month);
}

// Sync unsynced transactions to Supabase (background process)
export async function syncToSupabase(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.log('No user ID, skipping sync');
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      logger.log('Offline, skipping sync');
      return;
    }

    const unsynced = await db.getUnsyncedTransactions();
    logger.log(`Syncing ${unsynced.length} transactions to Supabase...`);

    for (const localTx of unsynced) {
      try {
        // If this transaction has a Supabase ID, it means we need to UPDATE, not INSERT
        if (localTx.supabaseId) {
          logger.log(`Updating transaction ${localTx.id} in Supabase (ID: ${localTx.supabaseId})...`);

          const { error } = await supabase
            .from('transactions')
            .update({
              subcategory_id: localTx.subcategoryId,
              amount: localTx.amount,
              occurred_at: localTx.occurredAt,
              notes: localTx.notes,
            })
            .eq('id', localTx.supabaseId)
            .eq('user_id', userId);

          if (error) {
            logger.error('Error updating transaction in Supabase:', error);
            continue;
          }

          // Mark as synced
          await db.markAsSynced(localTx.id, localTx.supabaseId);
          logger.log(`Updated transaction ${localTx.id} in Supabase`);
        } else {
          // This is a new transaction, INSERT it
          const { data, error } = await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              local_id: localTx.id,
              subcategory_id: localTx.subcategoryId,
              amount: localTx.amount,
              occurred_at: localTx.occurredAt,
              notes: localTx.notes,
            })
            .select()
            .single();

          if (error) {
            // Check if it's a duplicate error (already exists in Supabase)
            if (error.code === '23505' || error.message?.includes('duplicate')) {
              logger.log(`Transaction ${localTx.id} already exists in Supabase, fetching...`);

              // Try to find the existing transaction in Supabase
              const { data: existing, error: fetchError } = await supabase
                .from('transactions')
                .select('id')
                .eq('user_id', userId)
                .eq('local_id', localTx.id)
                .single();

              if (!fetchError && existing) {
                // Mark as synced with the existing Supabase ID
                await db.markAsSynced(localTx.id, existing.id);
                logger.log(`Marked transaction ${localTx.id} as synced with existing Supabase ID ${existing.id}`);
              } else {
                logger.error('Could not find existing transaction in Supabase:', fetchError);
              }
            } else {
              logger.error('Error syncing transaction:', error);
            }
            continue;
          }

          // Mark as synced in local DB
          await db.markAsSynced(localTx.id, data.id);
          logger.log(`Synced transaction ${localTx.id} -> Supabase ID ${data.id}`);
        }
      } catch (err) {
        logger.error('Error syncing individual transaction:', err);
      }
    }

    logger.log('Sync complete');
  } catch (err) {
    logger.error('Sync to Supabase failed:', err);
  }
}

// Pull transactions from Supabase and merge into local DB
// (Useful for initial setup or syncing from another device)
export async function pullFromSupabase(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.log('No user ID, skipping pull');
      return;
    }

    if (!navigator.onLine) {
      logger.log('Offline, skipping pull');
      return;
    }

    logger.log('Pulling transactions from Supabase...');
    const { data: supabaseTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error pulling from Supabase:', error);
      return;
    }

    if (!supabaseTransactions || supabaseTransactions.length === 0) {
      logger.log('No transactions in Supabase yet');
      return;
    }

    const localTransactions = await db.getAllTransactions();
    const localIds = new Set(localTransactions.map(t => t.id));
    const supabaseIds = new Set(localTransactions.map(t => t.supabaseId).filter(Boolean));

    let addedCount = 0;

    // Add transactions from Supabase that don't exist locally
    for (const supaTx of supabaseTransactions) {
      // Skip if we already have this transaction (by local_id or supabase id)
      if (localIds.has(supaTx.local_id) || supabaseIds.has(supaTx.id)) {
        continue;
      }

      // This is a new transaction from another device or initial sync
      const newLocalTx = await db.addTransaction({
        subcategoryId: supaTx.subcategory_id,
        amount: Number(supaTx.amount),
        occurredAt: supaTx.occurred_at,
        notes: supaTx.notes,
      });

      // Mark as already synced with the Supabase ID
      await db.markAsSynced(newLocalTx.id, supaTx.id);
      addedCount++;
    }

    logger.log(`Pull complete: Added ${addedCount} transactions from Supabase`);
  } catch (err) {
    logger.error('Pull from Supabase failed:', err);
  }
}

// Get sync status
export async function getSyncStatus(): Promise<{
  total: number;
  synced: number;
  unsynced: number;
}> {
  const all = await db.getAllTransactions();
  const unsynced = await db.getUnsyncedTransactions();

  return {
    total: all.length,
    synced: all.length - unsynced.length,
    unsynced: unsynced.length,
  };
}

// Update a local transaction
export async function updateLocalTransaction(
  id: string,
  updates: {
    subcategoryId?: number;
    amount?: number;
    occurredAt?: string;
    notes?: string;
  }
): Promise<void> {
  await db.updateTransaction(id, {
    ...updates,
    syncedToSupabase: false, // Mark as unsynced so it will re-sync
  });

  // Trigger background sync (non-blocking)
  syncToSupabase().catch(err => logger.error('Background sync failed:', err));
}

// Delete a local transaction
export async function deleteLocalTransaction(id: string): Promise<void> {
  const localTx = await db.getAllTransactions().then(txs => txs.find(t => t.id === id));

  if (!localTx) {
    throw new Error('Transaction not found');
  }

  // Delete from local DB
  await db.deleteTransaction(id);

  // If it was synced to Supabase, delete from there too
  if (localTx.syncedToSupabase && localTx.supabaseId) {
    const userId = await getCurrentUserId();
    if (userId && navigator.onLine) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', localTx.supabaseId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error deleting from Supabase:', error);
      }
    }
  }
}

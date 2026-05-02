import { logger } from '@/lib/logger';
import * as db from '@/lib/db';
import { supabase, getCurrentUserId } from '@/lib/supabase';

// Sync scheduled transactions to Supabase
export async function syncScheduledToSupabase(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.log('No user ID, skipping scheduled transaction sync');
      return;
    }

    if (!navigator.onLine) {
      logger.log('Offline, skipping scheduled transaction sync');
      return;
    }

    const localScheduled = await db.getAllScheduledTransactions();
    const unsyncedLocal = localScheduled.filter(st => !st.syncedToSupabase);

    logger.log(`Syncing ${unsyncedLocal.length} scheduled transactions to Supabase...`);

    for (const localSt of unsyncedLocal) {
      try {
        // Check if exists in Supabase by local_id
        const { data: existing, error: fetchError } = await supabase
          .from('scheduled_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('local_id', localSt.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          logger.error('Error checking existing scheduled transaction:', fetchError);
          continue;
        }

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('scheduled_transactions')
            .update({
              subcategory_id: localSt.subcategoryId,
              amount: localSt.amount,
              notes: localSt.notes,
              schedule_type: localSt.scheduleType,
              schedule_value: localSt.scheduleValue,
              is_enabled: localSt.isEnabled,
              generated_months: localSt.generatedMonths,
            })
            .eq('id', existing.id)
            .eq('user_id', userId);

          if (updateError) {
            logger.error('Error updating scheduled transaction:', updateError);
            continue;
          }

          await db.updateScheduledTransaction(localSt.id, {
            syncedToSupabase: true,
            supabaseId: existing.id,
          });
        } else {
          // Insert new
          const { data, error: insertError } = await supabase
            .from('scheduled_transactions')
            .insert({
              user_id: userId,
              local_id: localSt.id,
              subcategory_id: localSt.subcategoryId,
              amount: localSt.amount,
              notes: localSt.notes,
              schedule_type: localSt.scheduleType,
              schedule_value: localSt.scheduleValue,
              is_enabled: localSt.isEnabled,
              generated_months: localSt.generatedMonths,
            })
            .select()
            .single();

          if (insertError) {
            logger.error('Error inserting scheduled transaction:', insertError);
            continue;
          }

          await db.updateScheduledTransaction(localSt.id, {
            syncedToSupabase: true,
            supabaseId: data.id,
          });
        }

        logger.log(`Synced scheduled transaction ${localSt.id}`);
      } catch (err) {
        logger.error('Error syncing individual scheduled transaction:', err);
      }
    }

    logger.log('Scheduled transaction sync complete');
  } catch (err) {
    logger.error('Sync scheduled transactions to Supabase failed:', err);
  }
}

// Pull scheduled transactions from Supabase
export async function pullScheduledFromSupabase(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.log('No user ID, skipping pull scheduled transactions');
      return;
    }

    if (!navigator.onLine) {
      logger.log('Offline, skipping pull scheduled transactions');
      return;
    }

    logger.log('Pulling scheduled transactions from Supabase...');
    const { data: supabaseScheduled, error } = await supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error pulling scheduled transactions from Supabase:', error);
      return;
    }

    if (!supabaseScheduled || supabaseScheduled.length === 0) {
      logger.log('No scheduled transactions in Supabase yet');
      return;
    }

    const localScheduled = await db.getAllScheduledTransactions();
    const localIds = new Set(localScheduled.map(st => st.id));
    const supabaseIds = new Set(localScheduled.map(st => st.supabaseId).filter(Boolean));

    let addedCount = 0;
    let updatedCount = 0;

    for (const supaSt of supabaseScheduled) {
      // Check if we already have this locally by local_id
      const existingLocal = localScheduled.find(lst => lst.id === supaSt.local_id);

      if (existingLocal) {
        // Update local with Supabase data if newer
        if (new Date(supaSt.updated_at) > new Date(existingLocal.updatedAt)) {
          await db.updateScheduledTransaction(existingLocal.id, {
            subcategoryId: supaSt.subcategory_id,
            amount: Number(supaSt.amount),
            notes: supaSt.notes,
            scheduleType: supaSt.schedule_type,
            scheduleValue: supaSt.schedule_value,
            isEnabled: supaSt.is_enabled,
            generatedMonths: supaSt.generated_months,
            syncedToSupabase: true,
            supabaseId: supaSt.id,
          });
          updatedCount++;
        }
      } else if (!supabaseIds.has(supaSt.id)) {
        // This is new from another device
        const newSt = await db.addScheduledTransaction({
          subcategoryId: supaSt.subcategory_id,
          amount: Number(supaSt.amount),
          notes: supaSt.notes,
          scheduleType: supaSt.schedule_type,
          scheduleValue: supaSt.schedule_value,
          isEnabled: supaSt.is_enabled,
        });

        // Update with Supabase metadata
        await db.updateScheduledTransaction(newSt.id, {
          generatedMonths: supaSt.generated_months,
          syncedToSupabase: true,
          supabaseId: supaSt.id,
        });
        addedCount++;
      }
    }

    logger.log(`Pull scheduled transactions complete: Added ${addedCount}, Updated ${updatedCount}`);
  } catch (err) {
    logger.error('Pull scheduled transactions from Supabase failed:', err);
  }
}

// Delete scheduled transaction from both local and Supabase
export async function deleteScheduledTransaction(id: string): Promise<void> {
  const localSt = await db.getAllScheduledTransactions().then(sts => sts.find(st => st.id === id));

  if (!localSt) {
    throw new Error('Scheduled transaction not found');
  }

  // Delete from local DB
  await db.deleteScheduledTransaction(id);

  // If it was synced to Supabase, delete from there too
  if (localSt.syncedToSupabase && localSt.supabaseId) {
    const userId = await getCurrentUserId();
    if (userId && navigator.onLine) {
      const { error } = await supabase
        .from('scheduled_transactions')
        .delete()
        .eq('id', localSt.supabaseId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error deleting scheduled transaction from Supabase:', error);
      }
    }
  }
}

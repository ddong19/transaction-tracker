// Utilities for generating transactions from scheduled transactions
import * as db from './db';
import { logger } from './logger';

/**
 * Calculate the date when a scheduled transaction should occur in a given month
 */
export function calculateScheduledDate(
  year: number,
  month: number, // 1-12
  scheduleType: db.ScheduleType,
  scheduleValue: number
): Date | null {
  if (scheduleType === 'day-of-month') {
    // scheduleValue is 1-31 (day of month)
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    // If the day doesn't exist in this month (e.g., Feb 31), use last day of month
    const day = Math.min(scheduleValue, lastDayOfMonth);

    return new Date(year, month - 1, day);
  } else if (scheduleType === 'day-of-week') {
    // scheduleValue is 0-6 (0=Sunday, 6=Saturday)
    // Find the first occurrence of this day of week in the month
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    // Calculate how many days until the target day of week
    let daysUntilTarget = scheduleValue - firstDayOfWeek;
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }

    const targetDate = new Date(year, month - 1, 1 + daysUntilTarget);

    // Make sure we're still in the same month
    if (targetDate.getMonth() !== month - 1) {
      return null;
    }

    return targetDate;
  }

  return null;
}

/**
 * Generate transactions from all enabled scheduled transactions for a given month
 * Only generates for current month or future months
 */
export async function generateScheduledTransactionsForMonth(
  year: number,
  month: number // 1-12
): Promise<number> {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const scheduledTransactions = await db.getEnabledScheduledTransactions();

  // Get current year and month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Check if the requested month is in the past
  const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);

  if (isPastMonth) {
    logger.log(`Skipping generation for past month ${yearMonth}`);
    return 0;
  }

  let generatedCount = 0;

  for (const scheduledTx of scheduledTransactions) {
    // Check if already generated for this month
    if (scheduledTx.generatedMonths.includes(yearMonth)) {
      logger.log(`Scheduled transaction ${scheduledTx.id} already generated for ${yearMonth}`);
      continue;
    }

    // Check if the scheduled transaction was created AFTER this month started
    // If viewing a current/future month, but the schedule was created after that month began,
    // only generate if it's for the current month or later
    const scheduleCreatedAt = new Date(scheduledTx.createdAt);
    const targetMonthStart = new Date(year, month - 1, 1);

    // If the schedule was created after the target month started, and the target month is in the past, skip
    if (scheduleCreatedAt > targetMonthStart && isPastMonth) {
      logger.log(`Scheduled transaction ${scheduledTx.id} was created after ${yearMonth}, skipping`);
      continue;
    }

    // Calculate the date for this month
    const occurredAt = calculateScheduledDate(
      year,
      month,
      scheduledTx.scheduleType,
      scheduledTx.scheduleValue
    );

    if (!occurredAt) {
      logger.log(`Could not calculate date for scheduled transaction ${scheduledTx.id} in ${yearMonth}`);
      continue;
    }

    // Generate the transaction
    try {
      await db.addTransaction({
        subcategoryId: scheduledTx.subcategoryId,
        amount: scheduledTx.amount,
        occurredAt: occurredAt.toISOString().split('T')[0], // YYYY-MM-DD format
        notes: scheduledTx.notes,
        scheduledTransactionId: scheduledTx.id,
      });

      // Mark as generated for this month
      await db.markScheduledTransactionGenerated(scheduledTx.id, yearMonth);

      generatedCount++;
      logger.log(`Generated transaction from scheduled transaction ${scheduledTx.id} for ${yearMonth}`);
    } catch (err) {
      logger.error(`Error generating transaction from scheduled transaction ${scheduledTx.id}:`, err);
    }
  }

  return generatedCount;
}

/**
 * Get a human-readable description of the schedule
 */
export function getScheduleDescription(scheduleType: db.ScheduleType, scheduleValue: number): string {
  if (scheduleType === 'day-of-month') {
    const suffix = getDaySuffix(scheduleValue);
    return `Monthly on the ${scheduleValue}${suffix}`;
  } else if (scheduleType === 'day-of-week') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Every ${dayNames[scheduleValue]}`;
  }
  return 'Unknown schedule';
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

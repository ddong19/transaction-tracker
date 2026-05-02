import { useMemo } from 'react';
import { Calendar, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { ScheduledTransaction } from '@/lib/db';
import { getScheduleDescription } from '@/lib/scheduledTransactionUtils';
import { Button } from './ui/button';

interface ScheduledTransactionsViewProps {
  scheduledTransactions: ScheduledTransaction[];
  categoryMap: Map<number, { categoryName: string; subcategoryName: string }>;
  selectedMonth: string;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

export function ScheduledTransactionsView({
  scheduledTransactions,
  categoryMap,
  selectedMonth,
  onToggleEnabled,
  onDelete,
}: ScheduledTransactionsViewProps) {
  const enrichedScheduledTransactions = useMemo(() => {
    return scheduledTransactions.map(st => {
      const categoryInfo = categoryMap.get(st.subcategoryId);
      const isGeneratedThisMonth = st.generatedMonths.includes(selectedMonth);

      return {
        ...st,
        categoryName: categoryInfo?.categoryName || 'Unknown',
        subcategoryName: categoryInfo?.subcategoryName || 'Unknown',
        scheduleDescription: getScheduleDescription(st.scheduleType, st.scheduleValue),
        isGeneratedThisMonth,
      };
    });
  }, [scheduledTransactions, categoryMap, selectedMonth]);

  if (enrichedScheduledTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="w-12 h-12 text-slate-300 mb-3" />
        <div className="text-slate-400 mb-2">No scheduled expenses yet</div>
        <div className="text-sm text-slate-500">
          Add a scheduled expense to automatically generate transactions each month
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrichedScheduledTransactions.map((st) => (
        <div
          key={st.id}
          className={`bg-white rounded-xl border p-4 transition-all ${
            st.isEnabled ? 'border-slate-200' : 'border-slate-100 opacity-60'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                  {st.categoryName}
                </span>
                {st.isGeneratedThisMonth && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    Generated
                  </span>
                )}
                {!st.isEnabled && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    Disabled
                  </span>
                )}
              </div>
              <div className="font-medium text-slate-900">{st.subcategoryName}</div>
              <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {st.scheduleDescription}
              </div>
              {st.notes && (
                <div className="text-sm text-slate-500 mt-1">{st.notes}</div>
              )}
            </div>
            <div className="text-lg font-semibold text-slate-900 ml-4">
              ${st.amount.toFixed(2)}
            </div>
          </div>

          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleEnabled(st.id, !st.isEnabled)}
              className="flex-1 text-xs"
            >
              {st.isEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4 mr-1" />
                  Disable
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 mr-1" />
                  Enable
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(st.id)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

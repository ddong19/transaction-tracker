import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Transaction } from '../types';
import { Button } from './ui/button';

interface TransactionsPageProps {
  selectedMonth: string;
  transactions: Transaction[];
  onAddTransaction: () => void;
  onTransactionClick: (transaction: Transaction) => void;
}

export function TransactionsPage({ selectedMonth, transactions, onAddTransaction, onTransactionClick }: TransactionsPageProps) {
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, selectedMonth]);

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-4 pb-24">
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3 pt-4">
            {filteredTransactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => onTransactionClick(transaction)}
                className="w-full bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                        {transaction.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                    <div className="font-medium text-slate-900">{transaction.subcategory}</div>
                    {transaction.note && (
                      <div className="text-sm text-slate-500 mt-1">{transaction.note}</div>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 ml-4">
                    ${transaction.amount.toFixed(2)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-slate-400 mb-2">No transactions yet</div>
            <div className="text-sm text-slate-500">Add your first transaction to get started</div>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <Button
          onClick={onAddTransaction}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-14 text-base shadow-lg pointer-events-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </Button>
      </div>
    </div>
  );
}

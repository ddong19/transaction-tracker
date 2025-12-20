import { useMemo } from 'react';
import { Transaction } from '../types';

interface OverviewPageProps {
  selectedMonth: string;
  transactions: Transaction[];
}

interface CategoryData {
  name: string;
  total: number;
  subcategories: { name: string; amount: number }[];
}

const CATEGORIES = ['Needs', 'Wants', 'Savings', 'Tithing'];

export function OverviewPage({ selectedMonth, transactions }: OverviewPageProps) {
  const categoryData = useMemo(() => {
    const data: CategoryData[] = CATEGORIES.map(cat => ({
      name: cat,
      total: 0,
      subcategories: []
    }));

    // Filter transactions for selected month
    const filteredTransactions = transactions.filter(t => {
      const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      return txMonth === selectedMonth;
    });

    // Group by category and subcategory
    filteredTransactions.forEach(transaction => {
      const catIndex = CATEGORIES.indexOf(transaction.category);
      if (catIndex === -1) return;

      const category = data[catIndex];
      category.total += transaction.amount;

      const existingSub = category.subcategories.find(s => s.name === transaction.subcategory);
      if (existingSub) {
        existingSub.amount += transaction.amount;
      } else {
        category.subcategories.push({
          name: transaction.subcategory,
          amount: transaction.amount
        });
      }
    });

    // Sort subcategories by amount (highest to lowest)
    data.forEach(category => {
      category.subcategories.sort((a, b) => b.amount - a.amount);
    });

    return data;
  }, [transactions, selectedMonth]);

  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div className="space-y-6 px-4 pb-6">
      {/* Total Spending */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="text-sm opacity-80 mb-1">Total Spending</div>
        <div className="text-4xl">${totalSpending.toFixed(2)}</div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        {categoryData.map((category) => (
          <div key={category.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">{category.name}</h3>
              <div className="font-semibold text-slate-900">${category.total.toFixed(2)}</div>
            </div>
            {category.subcategories.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {category.subcategories.map((sub) => (
                  <div key={sub.name} className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-600">{sub.name}</span>
                    <span className="text-slate-900">${sub.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 text-slate-400 text-sm">No transactions</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

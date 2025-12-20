import { useState, useEffect, useMemo } from 'react';
import { Wallet, Receipt } from 'lucide-react';
import { OverviewPage } from './components/overview-page';
import { TransactionsPage } from './components/transactions-page';
import { AddTransactionDialog } from './components/add-transaction-dialog';
import { MonthSelector } from './components/month-selector';
import { Transaction } from './types';

type Tab = 'overview' | 'transactions';

// Mock data for demonstration
const MOCK_TRANSACTIONS: Transaction[] = [
  // December 2025 - Current month
  { id: '1', category: 'Needs', subcategory: 'Rent', amount: 1500, date: new Date(2025, 11, 1), note: 'Monthly rent payment' },
  { id: '2', category: 'Needs', subcategory: 'Groceries', amount: 85.42, date: new Date(2025, 11, 3), note: 'Weekly groceries' },
  { id: '3', category: 'Wants', subcategory: 'Dining', amount: 45.50, date: new Date(2025, 11, 5), note: 'Dinner with friends' },
  { id: '4', category: 'Needs', subcategory: 'Utilities', amount: 120.00, date: new Date(2025, 11, 7), note: 'Electric and water' },
  { id: '5', category: 'Wants', subcategory: 'Entertainment', amount: 15.99, date: new Date(2025, 11, 8), note: 'Movie tickets' },
  { id: '6', category: 'Savings', subcategory: 'Emergency Fund', amount: 500, date: new Date(2025, 11, 10), note: 'Monthly savings' },
  { id: '7', category: 'Tithing', subcategory: 'Church', amount: 200, date: new Date(2025, 11, 10), note: 'Weekly tithe' },
  { id: '8', category: 'Needs', subcategory: 'Groceries', amount: 92.18, date: new Date(2025, 11, 10), note: 'Weekly groceries' },
  { id: '9', category: 'Wants', subcategory: 'Shopping', amount: 68.99, date: new Date(2025, 11, 12), note: 'New shoes' },
  { id: '10', category: 'Needs', subcategory: 'Transportation', amount: 50.00, date: new Date(2025, 11, 14), note: 'Gas' },
  { id: '11', category: 'Wants', subcategory: 'Dining', amount: 32.75, date: new Date(2025, 11, 15), note: 'Lunch downtown' },
  { id: '12', category: 'Needs', subcategory: 'Healthcare', amount: 25.00, date: new Date(2025, 11, 16), note: 'Pharmacy co-pay' },
  { id: '13', category: 'Wants', subcategory: 'Subscriptions', amount: 12.99, date: new Date(2025, 11, 17), note: 'Streaming service' },
  { id: '14', category: 'Needs', subcategory: 'Groceries', amount: 78.65, date: new Date(2025, 11, 17), note: 'Weekly groceries' },
  { id: '15', category: 'Tithing', subcategory: 'Charity', amount: 50.00, date: new Date(2025, 11, 18), note: 'Local food bank' },
  { id: '16', category: 'Wants', subcategory: 'Entertainment', amount: 28.00, date: new Date(2025, 11, 19), note: 'Concert tickets' },
  
  // November 2025 - Previous month
  { id: '17', category: 'Needs', subcategory: 'Rent', amount: 1500, date: new Date(2025, 10, 1), note: 'Monthly rent payment' },
  { id: '18', category: 'Needs', subcategory: 'Groceries', amount: 320.50, date: new Date(2025, 10, 5), note: 'Monthly groceries' },
  { id: '19', category: 'Wants', subcategory: 'Dining', amount: 125.80, date: new Date(2025, 10, 8), note: 'Restaurants' },
  { id: '20', category: 'Needs', subcategory: 'Utilities', amount: 115.00, date: new Date(2025, 10, 10), note: 'Monthly utilities' },
  { id: '21', category: 'Savings', subcategory: 'Investments', amount: 300, date: new Date(2025, 10, 15), note: 'Index fund' },
  { id: '22', category: 'Tithing', subcategory: 'Church', amount: 180, date: new Date(2025, 10, 15), note: 'Monthly tithe' },
  { id: '23', category: 'Needs', subcategory: 'Transportation', amount: 150.00, date: new Date(2025, 10, 20), note: 'Gas and maintenance' },
  { id: '24', category: 'Wants', subcategory: 'Shopping', amount: 89.99, date: new Date(2025, 10, 22), note: 'Clothing' },
  { id: '25', category: 'Wants', subcategory: 'Entertainment', amount: 45.00, date: new Date(2025, 10, 25), note: 'Games' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Load transactions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('spending-tracker-transactions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const withDates = parsed.map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }));
        setTransactions(withDates);
      } catch (e) {
        console.error('Failed to load transactions', e);
      }
    } else {
      // If no data in localStorage, use mock data
      setTransactions(MOCK_TRANSACTIONS);
    }
  }, []);

  // Save transactions to localStorage
  useEffect(() => {
    localStorage.setItem('spending-tracker-transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Calculate available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    // Add current month
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    
    // Add months from transactions
    transactions.forEach(t => {
      const month = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      months.add(month);
    });
    
    // Sort in descending order (newest first)
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: crypto.randomUUID(),
    };
    setTransactions(prev => [...prev, transaction]);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Spending Tracker</h1>
          <MonthSelector
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Transactions
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' ? (
          <OverviewPage selectedMonth={selectedMonth} transactions={transactions} />
        ) : (
          <TransactionsPage
            selectedMonth={selectedMonth}
            transactions={transactions}
            onAddTransaction={() => setIsAddDialogOpen(true)}
          />
        )}
      </div>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddTransaction}
      />
    </div>
  );
}
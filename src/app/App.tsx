import { useState, useMemo } from 'react';
import { Wallet, Receipt, LogOut, WifiOff, Cloud } from 'lucide-react';
import { OverviewPage } from './components/overview-page';
import { TransactionsPage } from './components/transactions-page';
import { AddTransactionDialog } from './components/add-transaction-dialog';
import { MonthSelector } from './components/month-selector';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useSupabaseData';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../components/AuthScreen';

type Tab = 'overview' | 'transactions';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <AuthenticatedApp onSignOut={signOut} />;
}

function AuthenticatedApp({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch all transactions (not filtered by month for calculating available months)
  const { transactions: allTransactions, loading: loadingAll } = useTransactions();

  // Fetch transactions for selected month
  const { transactions, loading, addTransaction, pendingCount, isOffline } = useTransactions(selectedMonth);

  // Fetch categories and subcategories
  const { categories, loading: loadingCategories } = useCategories();

  // Calculate available months from all transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();

    // Add current month
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    // Add months from transactions
    allTransactions.forEach(t => {
      const month = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      months.add(month);
    });

    // Sort in descending order (newest first)
    return Array.from(months).sort().reverse();
  }, [allTransactions]);

  const handleAddTransaction = async (newTransaction: {
    subcategoryId: number;
    amount: number;
    date: Date;
    note: string;
  }) => {
    await addTransaction({
      subcategoryId: newTransaction.subcategoryId,
      amount: newTransaction.amount,
      occurredAt: newTransaction.date.toISOString().split('T')[0],
      notes: newTransaction.note || undefined,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        {/* Offline/Sync indicator */}
        {(isOffline || pendingCount > 0) && (
          <div className={`mb-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            isOffline ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {isOffline ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline - Changes will sync when connected</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <Cloud className="w-4 h-4" />
                <span>Syncing {pendingCount} transaction{pendingCount > 1 ? 's' : ''}...</span>
              </>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Spending Tracker</h1>
          <div className="flex items-center gap-2">
            <MonthSelector
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            <button
              onClick={onSignOut}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
            </button>
          </div>
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
        categories={categories}
        loading={loadingCategories}
      />
    </div>
  );
}
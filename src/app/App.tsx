import { useState } from 'react';
import { Wallet, Receipt, LogOut, WifiOff, Cloud, RefreshCw } from 'lucide-react';
import { OverviewPage } from './components/overview-page';
import { TransactionsPage } from './components/transactions-page';
import { AddTransactionDialog } from './components/add-transaction-dialog';
import { EditTransactionDialog } from './components/edit-transaction-dialog';
import { MonthSelector } from './components/month-selector';
import { useLocalTransactions } from '../hooks/useLocalTransactions';
import { useAllTransactionMonths } from '../hooks/useAllTransactionMonths';
import { useCategories } from '../hooks/useSupabaseData';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../components/AuthScreen';
import { Transaction } from './types';
import { pullFromSupabase } from '../services/transactionService';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch transactions for selected month (single source)
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction, syncStatus } = useLocalTransactions(selectedMonth);

  // Fetch categories and subcategories
  const { categories, loading: loadingCategories } = useCategories();

  // Get all available months (lightweight query, just month strings)
  const availableMonths = useAllTransactionMonths();

  // Manual sync from cloud
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await pullFromSupabase();
      // Reload the page to show the new data
      window.location.reload();
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('Sync failed. Please try again.');
      setIsSyncing(false);
    }
  };

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

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTransaction = async (updates: {
    subcategoryId: number;
    amount: number;
    date: Date;
    note: string;
  }) => {
    if (!selectedTransaction) return;

    await updateTransaction(selectedTransaction.id, {
      subcategoryId: updates.subcategoryId,
      amount: updates.amount,
      occurredAt: updates.date.toISOString().split('T')[0],
      notes: updates.note || undefined,
    });
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    await deleteTransaction(selectedTransaction.id);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        {/* Sync status indicator */}
        {syncStatus.unsynced > 0 && (
          <div className={`mb-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            !navigator.onLine ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {!navigator.onLine ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline - {syncStatus.unsynced} transaction{syncStatus.unsynced > 1 ? 's' : ''} will sync when connected</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Syncing {syncStatus.unsynced} transaction{syncStatus.unsynced > 1 ? 's' : ''}...</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Spending Tracker</h1>
          <div className="flex items-center gap-1">
            <MonthSelector
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              title="Sync from cloud"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
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
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-600">Loading transactions...</div>
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewPage selectedMonth={selectedMonth} transactions={transactions} />
        ) : (
          <TransactionsPage
            selectedMonth={selectedMonth}
            transactions={transactions}
            onAddTransaction={() => setIsAddDialogOpen(true)}
            onTransactionClick={handleTransactionClick}
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

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedTransaction(null);
        }}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        transaction={selectedTransaction}
        categories={categories}
        loading={loadingCategories}
      />
    </div>
  );
}
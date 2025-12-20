import { Database } from '@/lib/database.types';

export interface Transaction {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  date: Date;
  note: string;
}

// Supabase types
export type DbTransaction = Database['public']['Tables']['transactions']['Row'];
export type DbCategory = Database['public']['Tables']['categories']['Row'];
export type DbSubcategory = Database['public']['Tables']['subcategories']['Row'];

// Helper to convert Supabase transaction to app transaction format
export function dbTransactionToTransaction(
  dbTx: DbTransaction,
  subcategory: DbSubcategory,
  category: DbCategory
): Transaction {
  return {
    id: dbTx.id.toString(),
    category: category.name,
    subcategory: subcategory.name,
    amount: Number(dbTx.amount),
    date: new Date(dbTx.occurred_at),
    note: dbTx.notes || '',
  };
}

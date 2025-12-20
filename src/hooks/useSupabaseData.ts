import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];
type Subcategory = Database['public']['Tables']['subcategories']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();

        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('name');

        if (categoriesError) throw categoriesError;

        // Fetch subcategories
        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('user_id', userId)
          .order('display_order');

        if (subcategoriesError) throw subcategoriesError;

        // Combine categories with their subcategories
        const categoriesWithSubs: CategoryWithSubcategories[] = (categoriesData || []).map(cat => ({
          ...cat,
          subcategories: (subcategoriesData || []).filter(sub => sub.category_id === cat.id)
        }));

        setCategories(categoriesWithSubs);
      } catch (err) {
        setError(err as Error);
        if (import.meta.env.DEV) {
          console.error('Error fetching categories:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { categories, loading, error };
}

export function useTransactions(selectedMonth?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();

        if (!userId) {
          throw new Error('User not authenticated');
        }

        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('occurred_at', { ascending: false });

        // Filter by month if provided
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-');
          const startDate = `${year}-${month}-01`;
          const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

          query = query
            .gte('occurred_at', startDate)
            .lte('occurred_at', endDate);
        }

        const { data, error: txError } = await query;

        if (txError) throw txError;

        setTransactions(data || []);
      } catch (err) {
        setError(err as Error);
        if (import.meta.env.DEV) {
          console.error('Error fetching transactions:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [selectedMonth]);

  const addTransaction = async (transaction: Database['public']['Tables']['transactions']['Insert']) => {
    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: userId,
          local_id: crypto.randomUUID(),
        })
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data, ...prev]);
      return data;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error adding transaction:', err);
      }
      throw err;
    }
  };

  return { transactions, loading, error, addTransaction };
}

export function useSubcategory(subcategoryId: number | null) {
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!subcategoryId) {
      setSubcategory(null);
      setLoading(false);
      return;
    }

    async function fetchSubcategory() {
      try {
        setLoading(true);
        const { data, error: subError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('id', subcategoryId)
          .single();

        if (subError) throw subError;

        setSubcategory(data);
      } catch (err) {
        setError(err as Error);
        if (import.meta.env.DEV) {
          console.error('Error fetching subcategory:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSubcategory();
  }, [subcategoryId]);

  return { subcategory, loading, error };
}

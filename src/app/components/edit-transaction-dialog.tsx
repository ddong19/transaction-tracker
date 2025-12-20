import { useState, useMemo, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CategoryWithSubcategories } from '../../hooks/useSupabaseData';
import { Transaction } from '../types';

interface EditTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (transaction: {
    subcategoryId: number;
    amount: number;
    date: Date;
    note: string;
  }) => void;
  onDelete: () => void;
  transaction: Transaction | null;
  categories: CategoryWithSubcategories[];
  loading: boolean;
}

export function EditTransactionDialog({
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  transaction,
  categories,
  loading
}: EditTransactionDialogProps) {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form when transaction changes
  useEffect(() => {
    if (transaction && categories.length > 0) {
      // Find the category for this transaction
      const category = categories.find(c => c.name === transaction.category);
      if (category) {
        setCategoryId(category.id.toString());

        // Find the subcategory
        const subcategory = category.subcategories.find(s => s.name === transaction.subcategory);
        if (subcategory) {
          setSubcategoryId(subcategory.id.toString());
        }
      }

      setAmount(transaction.amount.toString());
      setDate(transaction.date.toISOString().split('T')[0]);
      setNote(transaction.note || '');
    }
  }, [transaction, categories]);

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!categoryId) return [];
    const category = categories.find(c => c.id.toString() === categoryId);
    return category?.subcategories || [];
  }, [categoryId, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subcategoryId || !amount) {
      return;
    }

    onUpdate({
      subcategoryId: parseInt(subcategoryId),
      amount: parseFloat(amount),
      date: new Date(date),
      note,
    });

    onClose();
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Transaction</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="p-6 space-y-5">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Delete Transaction?</h3>
              <p className="text-slate-600">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryId}
                onValueChange={(val) => {
                  setCategoryId(val);
                  setSubcategoryId('');
                }}
                disabled={loading}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={loading ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoryId && availableSubcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                  <SelectTrigger id="subcategory">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

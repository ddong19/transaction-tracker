import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CategoryWithSubcategories } from '../../hooks/useSupabaseData';
import { ScheduleType } from '@/lib/db';
import { getScheduleDescription } from '@/lib/scheduledTransactionUtils';

interface AddScheduledTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (scheduledTransaction: {
    subcategoryId: number;
    amount: number;
    scheduleType: ScheduleType;
    scheduleValue: number;
    note: string;
  }) => void;
  categories: CategoryWithSubcategories[];
  loading: boolean;
}

export function AddScheduledTransactionDialog({
  isOpen,
  onClose,
  onAdd,
  categories,
  loading,
}: AddScheduledTransactionDialogProps) {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [scheduleValue, setScheduleValue] = useState('1');
  const [note, setNote] = useState('');

  // Always use day-of-month scheduling
  const scheduleType: ScheduleType = 'day-of-month';

  const availableSubcategories = useMemo(() => {
    if (!categoryId) return [];
    const category = categories.find(c => c.id.toString() === categoryId);
    return category?.subcategories || [];
  }, [categoryId, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submitted with:', { subcategoryId, amount, scheduleValue, scheduleType, note });

    if (!subcategoryId || !amount || !scheduleValue) {
      console.log('Validation failed: missing required fields', { subcategoryId, amount, scheduleValue });
      return;
    }

    const value = parseInt(scheduleValue);

    if (scheduleType === 'day-of-month' && (value < 1 || value > 31)) {
      console.log('Validation failed: invalid day of month', value);
      return;
    }
    if (scheduleType === 'day-of-week' && (value < 0 || value > 6)) {
      console.log('Validation failed: invalid day of week', value);
      return;
    }

    console.log('Calling onAdd with:', {
      subcategoryId: parseInt(subcategoryId),
      amount: parseFloat(amount),
      scheduleType,
      scheduleValue: value,
      note,
    });

    onAdd({
      subcategoryId: parseInt(subcategoryId),
      amount: parseFloat(amount),
      scheduleType,
      scheduleValue: value,
      note,
    });

    setCategoryId('');
    setSubcategoryId('');
    setAmount('');
    setScheduleValue('1');
    setNote('');
    onClose();
  };

  const scheduleOptions = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const suffix = day >= 11 && day <= 13 ? 'th' :
                    day % 10 === 1 ? 'st' :
                    day % 10 === 2 ? 'nd' :
                    day % 10 === 3 ? 'rd' : 'th';
      return { value: day, label: `${day}${suffix}` };
    });
  }, []);

  const previewDescription = useMemo(() => {
    if (scheduleValue) {
      const day = parseInt(scheduleValue);
      const suffix = day >= 11 && day <= 13 ? 'th' :
                    day % 10 === 1 ? 'st' :
                    day % 10 === 2 ? 'nd' :
                    day % 10 === 3 ? 'rd' : 'th';
      return `Repeats monthly on the ${day}${suffix}`;
    }
    return '';
  }, [scheduleValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Schedule Monthly Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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
                <SelectValue placeholder={loading ? 'Loading...' : 'Select category'} />
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
            <Label htmlFor="scheduleValue">Day of Month</Label>
            <Select value={scheduleValue} onValueChange={setScheduleValue}>
              <SelectTrigger id="scheduleValue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scheduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {previewDescription && (
              <p className="text-sm text-slate-500 mt-1">{previewDescription}</p>
            )}
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
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
              Schedule Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface MonthSelectorProps {
  availableMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthSelector({ availableMonths, selectedMonth, onMonthChange }: MonthSelectorProps) {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  return (
    <Select value={selectedMonth} onValueChange={onMonthChange}>
      <SelectTrigger className="h-8 px-2.5 text-sm border-0 bg-transparent hover:bg-slate-100 rounded-lg gap-1">
        <SelectValue>
          {formatMonth(selectedMonth)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableMonths.map((month) => (
          <SelectItem key={month} value={month}>
            {formatMonth(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

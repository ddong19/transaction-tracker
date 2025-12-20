export interface Transaction {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  date: Date;
  note: string;
}

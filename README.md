# Transaction Tracker

A personal finance app I built to track every single thing I spend money on. I got tired of not knowing where my money was going each month, so I built something exactly how I wanted it — categories that match how I actually think about spending, a clean mobile interface I can pull up in seconds, and data that lives on my phone even when I'm offline.

---

## What It Does

Every transaction I make gets logged here — the amount, what it was for, and when. Transactions are grouped into four main categories that I mapped to a rough budgeting framework: **Needs**, **Wants**, **Savings**, and **Tithe**. Each one has subcategories underneath (e.g., Needs → Groceries, Gas, Rent).

The **Overview page** shows me a monthly snapshot: total spent, broken down by category and subcategory. I can flip between months to compare spending patterns over time.

The **Transactions page** lists every entry for the selected month. Adding a transaction takes a few taps — pick the subcategory, type the amount, add a note if needed, done.

For recurring expenses like rent or subscriptions, I use **Scheduled Transactions**. I define them once — either on a specific day of the month or a day of the week — and the app generates the actual transaction automatically when I open that month's view. I can toggle them on/off or delete them at any time.

---

## Screenshots

<!-- Add screenshots here -->

---

## How I Use It

I log transactions throughout the day on my phone. The app is sized for mobile (max 448px), so it feels like a native app in the browser. At the end of the month I check the overview to see how I did against my mental budget — usually there's at least one subcategory that surprises me.

Since I built the categories myself, every transaction has a home. Nothing gets lumped into a vague "miscellaneous" bucket.

All of this data also feeds into my [Finance Dashboard](https://github.com/ddong19/finance-dashboard) — a separate app where I visualize spending trends, compare months, and get a higher-level view of my finances. This app is the data entry layer; the dashboard is where the analysis happens.

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- Radix UI + shadcn/ui for components
- Recharts for the spending breakdown charts
- Motion for animations

**Data & Sync**
- **IndexedDB** — the source of truth. All transactions are written locally first, so the app works completely offline.
- **Supabase** — handles auth (email/password) and cloud storage. A background sync process pushes any unsynced local transactions up to Supabase when a connection is available. The UI shows a badge with the unsynced count so I always know what's pending.

**Other**
- React Hook Form for all the dialogs/forms
- date-fns for date handling
- Sonner for toast notifications

---

## Running It Locally

```bash
npm install
npm run dev
```

You'll need a Supabase project with the matching schema. The database types live in [src/lib/database.types.ts](src/lib/database.types.ts) if you want to see the full table structure.

import { shared } from '../theme/colors';

export const CATEGORIES = {
  'Food & Dining':      { color: shared.coral,   icon: '🍔' },
  Shopping:             { color: shared.amber,    icon: '🛍️' },
  'Bills & Utilities':  { color: shared.violet,   icon: '💡' },
  Transport:            { color: shared.teal,     icon: '🚗' },
  Subscriptions:        { color: shared.neutral,  icon: '🎬' },
  Groceries:            { color: shared.teal,     icon: '🛒' },
  Travel:               { color: shared.amber,    icon: '✈️' },
  Other:                { color: shared.neutral,  icon: '❓' },
};

export const CATEGORY_LIST = Object.keys(CATEGORIES);

export const BUDGETS = {
  'Food & Dining': 10000,
  Shopping: 15000,
  Transport: 6000,
  Subscriptions: 5000,
};

export const MONTHLY_BUDGET = 60000;

export const SOURCES = ['GPay', 'PhonePe', 'Paytm', 'PayZapp', 'Bank', 'Manual'];

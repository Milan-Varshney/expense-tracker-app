// Pure functions over the raw transaction array. No side effects, no storage access.
// Every function takes the full transaction array (+ params) and returns derived data.

const isSpend = (txn) => txn.direction === 'debit';

export function monthKey(dateStr) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function shiftMonthKey(key, delta) {
  const [year, month] = key.split('-').map(Number);
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

export function filterByMonth(transactions, key) {
  return transactions.filter((txn) => monthKey(txn.date) === key);
}

export function getMonthsList(transactions) {
  const totals = new Map();
  transactions.filter(isSpend).forEach((txn) => {
    const key = monthKey(txn.date);
    totals.set(key, (totals.get(key) || 0) + txn.amount);
  });
  return Array.from(totals.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export function getCategoryTotals(transactions) {
  const totals = new Map();
  transactions.filter(isSpend).forEach((txn) => {
    totals.set(txn.category, (totals.get(txn.category) || 0) + txn.amount);
  });
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function getTopTransactions(transactions, n = 5) {
  return transactions
    .filter(isSpend)
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n);
}

export function getRecentTransactions(transactions, n = 2) {
  return transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, n);
}

export function getMonthOverMonthDelta(transactions, key) {
  const prevKey = shiftMonthKey(key, -1);
  const current = filterByMonth(transactions, key).filter(isSpend).reduce((s, t) => s + t.amount, 0);
  const previous = filterByMonth(transactions, prevKey).filter(isSpend).reduce((s, t) => s + t.amount, 0);

  if (previous === 0) {
    return { percent: current === 0 ? 0 : 100, direction: current >= 0 ? 'up' : 'down' };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    percent: Math.round(Math.abs(percent) * 10) / 10,
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
  };
}

export function getCategoryTrend(transactions, category, monthsBack = 6) {
  const months = getMonthsList(transactions)
    .map((m) => m.month)
    .sort();
  const lastMonths = months.slice(-monthsBack);

  return lastMonths.map((month) => {
    const total = filterByMonth(transactions, month)
      .filter(isSpend)
      .filter((t) => t.category === category)
      .reduce((s, t) => s + t.amount, 0);
    return { month, total };
  });
}

export function getMerchantBreakdown(transactions, category) {
  const totals = new Map();
  transactions
    .filter(isSpend)
    .filter((t) => t.category === category)
    .forEach((t) => totals.set(t.merchant, (totals.get(t.merchant) || 0) + t.amount));

  return Array.from(totals.entries())
    .map(([merchant, total]) => ({ merchant, total }))
    .sort((a, b) => b.total - a.total);
}

function categoryTotalForMonth(transactions, category, key) {
  return filterByMonth(transactions, key)
    .filter(isSpend)
    .filter((t) => t.category === category)
    .reduce((s, t) => s + t.amount, 0);
}

export function generateInsights(transactions, key) {
  const insights = [];
  const monthTxns = filterByMonth(transactions, key).filter(isSpend);
  const monthTotal = monthTxns.reduce((s, t) => s + t.amount, 0);
  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  categories.forEach((category) => {
    const currentTotal = categoryTotalForMonth(transactions, category, key);
    if (currentTotal === 0) return;

    // Category share alert
    const share = monthTotal > 0 ? (currentTotal / monthTotal) * 100 : 0;
    if (share > 25) {
      insights.push({
        id: `share-${category}`,
        type: 'category_share',
        category,
        severity: 'warning',
        message: `${category} is ${Math.round(share)}% of this month's spend.`,
        meta: { share: Math.round(share * 10) / 10, total: currentTotal },
      });
    }

    // Trend alert: current vs trailing 3-month average (excluding current)
    const trailingMonths = [shiftMonthKey(key, -1), shiftMonthKey(key, -2), shiftMonthKey(key, -3)];
    const trailingTotals = trailingMonths.map((m) => categoryTotalForMonth(transactions, category, m));
    const trailingAvg = trailingTotals.reduce((s, v) => s + v, 0) / trailingTotals.length;
    if (trailingAvg > 0 && currentTotal > trailingAvg * 1.3) {
      const pctUp = Math.round(((currentTotal - trailingAvg) / trailingAvg) * 100);
      insights.push({
        id: `trend-${category}`,
        type: 'trend',
        category,
        severity: 'alert',
        message: `${category} is up ${pctUp}% vs your average.`,
        meta: { percent: pctUp, average: Math.round(trailingAvg) },
      });
    }

    // Stability note: within +-5% of 6-month average
    const trend = getCategoryTrend(transactions, category, 6);
    if (trend.length > 0) {
      const avg6 = trend.reduce((s, m) => s + m.total, 0) / trend.length;
      if (avg6 > 0 && Math.abs(currentTotal - avg6) / avg6 <= 0.05) {
        insights.push({
          id: `stable-${category}`,
          type: 'stability',
          category,
          severity: 'positive',
          message: `${category} is on track — within 5% of your 6-month average.`,
          meta: { average: Math.round(avg6) },
        });
      }
    }
  });

  // Subscription growth
  const prevKey = shiftMonthKey(key, -1);
  const currentRecurringCount = monthTxns.filter((t) => t.isRecurring).length;
  const prevRecurringCount = filterByMonth(transactions, prevKey).filter(isSpend).filter((t) => t.isRecurring).length;
  if (currentRecurringCount > prevRecurringCount) {
    insights.push({
      id: 'subscription-growth',
      type: 'subscription_growth',
      severity: 'warning',
      message: `You added ${currentRecurringCount - prevRecurringCount} new recurring charge${
        currentRecurringCount - prevRecurringCount > 1 ? 's' : ''
      } this month.`,
      meta: { current: currentRecurringCount, previous: prevRecurringCount },
    });
  }

  return insights;
}

export function getUpcomingRenewals(transactions, referenceDate = new Date()) {
  const recurring = transactions.filter((t) => t.isRecurring);
  const latestByMerchant = new Map();
  recurring.forEach((t) => {
    const existing = latestByMerchant.get(t.merchant);
    if (!existing || t.date > existing.date) {
      latestByMerchant.set(t.merchant, t);
    }
  });

  return Array.from(latestByMerchant.values())
    .map((t) => {
      const lastDate = new Date(t.date);
      const renewalDate = new Date(lastDate);
      renewalDate.setDate(renewalDate.getDate() + 30);
      const daysUntil = Math.round((renewalDate - referenceDate) / (1000 * 60 * 60 * 24));
      return {
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        renewalDate: renewalDate.toISOString().slice(0, 10),
        daysUntil,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

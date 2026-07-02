export function formatCurrency(amount) {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
  return `${sign}₹${grouped}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

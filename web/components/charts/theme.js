export const chartColors = {
  revenue: 'var(--chart-revenue)',
  expenses: 'var(--chart-expenses)',
  goal: 'var(--chart-goal)',
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)'
};

export const chartPalette = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'
];

export const financeBars = [
  { key: 'expenses', label: 'Expenses', color: chartColors.expenses },
  { key: 'revenueOverExpenses', valueKey: 'revenue', label: 'Revenue', color: chartColors.revenue }
];

export const goalOutlines = [{ key: 'goal', label: 'Goal', color: chartColors.goal }];

const formats = {
  currency: {
    axis: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  },
  number: {
    axis: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
    value: new Intl.NumberFormat('en-US')
  }
};

export function chartFormat(name = 'number') {
  const format = formats[name] || formats.number;
  return { axis: (value) => format.axis.format(value), value: (value) => format.value.format(value) };
}

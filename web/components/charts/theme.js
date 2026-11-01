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

export const chartTooltipStyles = {
  contentStyle: {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--popover-foreground)'
  },
  itemStyle: { color: 'var(--popover-foreground)' },
  labelStyle: { color: 'var(--popover-foreground)' }
};

export const financeBars = [
  { key: 'expenses', label: 'Expenses', color: chartColors.expenses, displayOrder: 1 },
  { key: 'revenueOverExpenses', valueKey: 'revenue', label: 'Revenue', color: chartColors.revenue, displayOrder: 0 }
];

export const goalOutlines = [{ key: 'goal', label: 'Goal', color: chartColors.goal }];

export function chartSeries(bars, outlines = []) {
  return [...bars, ...outlines.map((outline) => ({ ...outline, outlined: true }))]
    .map((series, index) => ({ ...series, displayOrder: series.displayOrder ?? index }))
    .sort((first, second) => first.displayOrder - second.displayOrder);
}

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

export const chartColors = {
  revenue: '#57ae6b',
  expenses: '#e05d56',
  goal: '#b3cde0',
  grid: '#dce4dd',
  axis: '#65736d'
};

export const chartPalette = [
  '#57ae6b', '#4a8fe7', '#d4a054', '#e05d56', '#2e2a7a', '#9b6bd6',
  '#3bb3b0', '#e58fb1', '#7f8c8d', '#b5c94c', '#a0522d'
];

export const financeBars = [
  { key: 'expenses', label: 'Expenses', color: chartColors.expenses },
  { key: 'revenue', label: 'Revenue', color: chartColors.revenue }
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

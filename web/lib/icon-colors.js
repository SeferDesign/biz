export const iconColors = {
  overview: 'text-muted-foreground',
  clients: 'text-teal-600 dark:text-teal-400',
  invoices: 'text-blue-600 dark:text-blue-400',
  vendors: 'text-violet-600 dark:text-violet-400',
  expenses: 'text-rose-600 dark:text-rose-400',
  years: 'text-amber-600 dark:text-amber-400',
  best: 'text-warning',
  payments: 'text-success',
  backups: 'text-info'
};

export const paymentIconColors = {
  card: iconColors.invoices,
  us_bank_account: iconColors.clients,
  zelle: iconColors.vendors,
  check: iconColors.years
};

import ExpenseSpreadsheet from '../../../components/ExpenseSpreadsheet.js';
import { browserApiBaseUrl, getApiData } from '../../../lib/api.js';

export default async function ExpenseSpreadsheetPage() {
  const [expenseResult, vendorResult] = await Promise.all([
    getApiData('/expenses?all=true'),
    getApiData('/vendors')
  ]);
  const error = expenseResult.error || vendorResult.error;
  if (error) return <div className="notice" role="alert"><strong>Spreadsheet unavailable</strong><span>{error}</span></div>;
  return <ExpenseSpreadsheet initialExpenses={expenseResult.data} vendors={vendorResult.data} apiBaseUrl={browserApiBaseUrl} />;
}

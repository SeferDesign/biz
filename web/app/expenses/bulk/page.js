import ExpenseSpreadsheet from '../../../components/ExpenseSpreadsheet.js';
import Notice from '../../../components/Notice.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function ExpenseSpreadsheetPage() {
  const [expenseResult, vendorResult] = await Promise.all([
    getApiData('/expenses?all=true'),
    getApiData('/vendors')
  ]);
  const error = expenseResult.error || vendorResult.error;
  if (error) return <Notice title="Spreadsheet unavailable">{error}</Notice>;
  return <ExpenseSpreadsheet initialExpenses={expenseResult.data} vendors={vendorResult.data} apiBaseUrl={browserApiBaseUrl} />;
}

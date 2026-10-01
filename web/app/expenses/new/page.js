import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';
import { expenseFields } from '../../../lib/record-fields.js';

export default async function NewExpensePage({ searchParams }) {
  const params = await searchParams;
  const result = await getApiData('/vendors');
  const vendors = result.data || [];
  const requestedVendorId = Number(params?.vendor_id);
  const initialVendorId = vendors.some((vendor) => Number(vendor.id) === requestedVendorId)
    ? requestedVendorId
    : '';
  return <RecordForm title="New expense" description="Record a business expense and its vendor." fields={expenseFields(vendors)} initialValues={{ vendor_id: initialVendorId, date: new Date().toISOString().slice(0, 10), cost: '' }} endpoint={`${browserApiBaseUrl}/expenses`} returnTo="/expenses" submitLabel="Create expense" />;
}

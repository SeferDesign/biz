import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { vendorFields } from '../../../lib/record-fields.js';

export default function NewVendorPage() {
  return <RecordForm title="New Vendor" description="Add a supplier or service provider." fields={vendorFields} endpoint={`${browserApiBaseUrl}/vendors`} returnTo="/vendors" submitLabel="Create Vendor" />;
}

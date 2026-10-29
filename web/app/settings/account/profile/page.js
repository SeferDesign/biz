import AccountProfileForm from '../../../../components/AccountProfileForm.js';
import { getApiData } from '../../../../lib/api-server.js';
import Notice from '../../../../components/Notice.js';

export const metadata = { title: 'Account Profile' };

export default async function AccountProfilePage() {
  const result = await getApiData('/auth/profile');
  if (result.error) {
    return <Notice title="Profile unavailable">{result.error}</Notice>;
  }
  return <AccountProfileForm initialUser={result.data?.user || { first_name: '', last_name: '' }} />;
}

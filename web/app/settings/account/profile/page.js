import AccountProfileForm from '../../../../components/AccountProfileForm.js';
import { getApiData } from '../../../../lib/api-server.js';

export const metadata = { title: 'Account Profile' };

export default async function AccountProfilePage() {
  const result = await getApiData('/auth/profile');
  if (result.error) {
    return <div className="notice" role="alert"><strong>Profile unavailable</strong><span>{result.error}</span></div>;
  }
  return <AccountProfileForm initialUser={result.data?.user || { first_name: '', last_name: '' }} />;
}

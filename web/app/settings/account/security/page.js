import SecuritySettings from '../../../../components/SecuritySettings.js';
import { getApiData } from '../../../../lib/api-server.js';

export const metadata = { title: 'Account Security | Sefer Design Company' };

export default async function SecurityPage() {
  const result = await getApiData('/auth/security');
  if (result.error) {
    return <div className="notice" role="alert"><strong>Security settings unavailable</strong><span>{result.error}</span></div>;
  }
  return <SecuritySettings initialSettings={result.data} />;
}
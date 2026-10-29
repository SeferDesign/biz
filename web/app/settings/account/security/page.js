import SecuritySettings from '../../../../components/SecuritySettings.js';
import { getApiData } from '../../../../lib/api-server.js';
import Notice from '../../../../components/Notice.js';

export const metadata = { title: 'Account Security' };

export default async function SecurityPage() {
  const result = await getApiData('/auth/security');
  if (result.error) {
    return <Notice title="Security settings unavailable">{result.error}</Notice>;
  }
  return <SecuritySettings initialSettings={result.data} />;
}

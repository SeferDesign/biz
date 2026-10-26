import ApiKeysSettings from '../../../../components/ApiKeysSettings.js';
import { getApiData } from '../../../../lib/api-server.js';

export const metadata = { title: 'Account API Keys' };

export default async function ApiKeysPage() {
  const result = await getApiData('/auth/api-keys');
  if (result.error) {
    return <div className="notice" role="alert"><strong>API keys unavailable</strong><span>{result.error}</span></div>;
  }
  return <ApiKeysSettings initialKeys={result.data || []} />;
}

import ApiKeysSettings from '../../../../components/ApiKeysSettings.js';
import { getApiData } from '../../../../lib/api-server.js';
import Notice from '../../../../components/Notice.js';

export const metadata = { title: 'Account API Keys' };

export default async function ApiKeysPage() {
  const result = await getApiData('/auth/api-keys');
  if (result.error) {
    return <Notice title="API keys unavailable">{result.error}</Notice>;
  }
  return <ApiKeysSettings initialKeys={result.data || []} />;
}

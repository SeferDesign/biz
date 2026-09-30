import 'server-only';
import { cookies } from 'next/headers';
import { getApiData as fetchApiData } from './api.js';

export async function getApiData(path, options = {}) {
  const accessToken = (await cookies()).get('biz_session')?.value;
  return fetchApiData(path, { ...options, accessToken });
}

const apiBaseUrl = process.env.API_INTERNAL_URL || 'https://api.biz.loc:9443';

async function getApiHealth() {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, { cache: 'no-store' });
    if (!response.ok) {
      return { status: `error ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { status: 'unreachable', error: error.message };
  }
}

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main>
      <h1>Sefer Design Biz</h1>
      <p>Web client placeholder.</p>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </main>
  );
}

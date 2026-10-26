import LoginForm from '../../components/LoginForm.js';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }) {
  const query = await searchParams;
  const candidate = typeof query?.next === 'string' ? query.next : '/';
  const returnTo = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
  return <LoginForm returnTo={returnTo} />;
}

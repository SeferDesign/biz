import { ResetPasswordForm } from '../../components/PasswordRecoveryForm.js';

export const metadata = { title: 'Reset password | Sefer Design Company' };

export default async function ResetPasswordPage({ searchParams }) {
  const query = await searchParams;
  return <ResetPasswordForm token={typeof query?.token === 'string' ? query.token : ''} />;
}
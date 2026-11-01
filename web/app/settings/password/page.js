import { redirect } from 'next/navigation';

export const metadata = { title: 'Account Password' };

export default function LegacyPasswordPage() {
  redirect('/settings/account/password');
}

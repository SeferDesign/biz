import { redirect } from 'next/navigation';

export default function LegacyPasswordPage() {
  redirect('/settings/account/password');
}
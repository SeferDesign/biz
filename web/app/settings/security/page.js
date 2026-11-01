import { redirect } from 'next/navigation';

export const metadata = { title: 'Account Security' };

export default function LegacySecurityPage() {
  redirect('/settings/account/security');
}

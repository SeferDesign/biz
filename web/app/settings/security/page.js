import { redirect } from 'next/navigation';

export default function LegacySecurityPage() {
  redirect('/settings/account/security');
}

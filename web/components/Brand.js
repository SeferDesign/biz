import Link from 'next/link';
import { companyInfo } from '@seferbiz/company';

export default function Brand({ href = 'https://seferdesign.com', label = companyInfo.name, classes = 'brand' }) {
  return (
    <Link className={classes} href={href}>
      <img className="brand-logo" src={companyInfo.logoPath} alt={label} />
    </Link>
  );
}

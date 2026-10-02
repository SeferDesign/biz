import Link from 'next/link';
import { companyInfo } from '@seferbiz/company';

export default function Brand({ href = companyInfo.website, label = companyInfo.name, classes = 'brand' }) {
	if (!companyInfo.logo?.pathPublic) {
		return null;
	}
  return (
    <Link className={classes} href={href}>
      <img className="brand-logo" src={companyInfo.logo.pathPublic} alt={label} />
    </Link>
  );
}

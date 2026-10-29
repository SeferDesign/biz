import Link from 'next/link';
import DeleteButton from './DeleteButton.js';
import { Button } from './ui/button.js';

export default function ResourceActions({ editHref, deleteEndpoint, returnTo, label }) {
  return (
    <div className="detail-actions">
      <Button asChild variant="outline"><Link href={editHref}>Edit</Link></Button>
      <DeleteButton endpoint={deleteEndpoint} returnTo={returnTo} label={`Delete ${label}`} />
    </div>
  );
}

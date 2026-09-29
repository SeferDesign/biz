import Link from 'next/link';
import DeleteButton from './DeleteButton.js';

export default function ResourceActions({ editHref, deleteEndpoint, returnTo, label }) {
  return (
    <div className="detail-actions">
      <Link className="secondary-button" href={editHref}>Edit</Link>
      <DeleteButton endpoint={deleteEndpoint} returnTo={returnTo} label={`Delete ${label}`} />
    </div>
  );
}

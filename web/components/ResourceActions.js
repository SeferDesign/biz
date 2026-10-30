import Link from 'next/link';
import DeleteButton from './DeleteButton.js';
import { Button } from './ui/button.js';
import { ButtonGroup } from './ui/button-group.js';

export default function ResourceActions({ editHref, deleteEndpoint, returnTo, label }) {
  return (
    <ButtonGroup aria-label={`${label} actions`}>
      <Button asChild variant="outline"><Link href={editHref}>Edit</Link></Button>
      <DeleteButton endpoint={deleteEndpoint} returnTo={returnTo} label={`Delete ${label}`} />
    </ButtonGroup>
  );
}

'use client';

import { Toaster as Sonner } from 'sonner';

function Toaster(props) {
  return <Sonner position="bottom-right" richColors closeButton {...props} />;
}

export { Toaster };

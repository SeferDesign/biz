'use client';

import { Toaster as Sonner } from 'sonner';

function Toaster(props) {
  return <Sonner position="bottom-right" theme="system" richColors closeButton {...props} />;
}

export { Toaster };

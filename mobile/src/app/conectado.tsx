import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';

// Pluggy's /conectar page returns here (liuliu://conectado?itemId=…). The bank-connection flow in
// lib/actions.ts already got the URL from the browser session, so this route only steps back.
export default function Connected() {
  const canGoBack = router.canGoBack();
  useEffect(() => {
    if (canGoBack) router.back();
  }, [canGoBack]);
  return canGoBack ? null : <Redirect href="/" />;
}

import { Wordmark } from "@/components/Wordmark";
import { MobileConnect } from "./MobileConnect";

export const metadata = { title: "Conectar banco · liu liu" };

// Opened by the mobile app in the system browser (popups and the bank's OAuth work there, not in a WebView).
// It gets a short-lived Pluggy connect token, so it needs no session, and only redirects back to the app.
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ token?: string; volta?: string }> }) {
  const { token, volta } = await searchParams;
  const back = volta && /^(liuliu|exp|exps):\/\//.test(volta) ? volta : null;
  return (
    <main className="login">
      <Wordmark />
      {token && back ? <MobileConnect token={token} back={back} /> : <p className="err">Link de conexão inválido. Volte ao app e tente de novo.</p>}
    </main>
  );
}

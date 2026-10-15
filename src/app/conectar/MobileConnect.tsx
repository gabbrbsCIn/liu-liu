"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

const PluggyConnect = dynamic(() => import("react-pluggy-connect").then((m) => m.PluggyConnect), { ssr: false });

// Only the app's own deep links (or Expo Go's in development) may receive the result.
const isAppLink = (u: string) => {
  try {
    return ["liuliu:", "exp:", "exps:"].includes(new URL(u).protocol);
  } catch {
    return false;
  }
};

export function MobileConnect({ token, back }: { token: string; back: string }) {
  const [done, setDone] = useState<string | null>(null);
  if (!isAppLink(back)) return <p className="err">Endereço de retorno inválido.</p>;
  const go = (params: Record<string, string>) => {
    const url = `${back}${back.includes("?") ? "&" : "?"}${new URLSearchParams(params)}`;
    setDone(url);
    window.location.href = url;
  };
  if (done)
    return (
      <p className="muted" style={{ textAlign: "center" }}>
        Pronto. <a href={done}>Voltar ao liu liu</a>
      </p>
    );
  return (
    <>
      <p className="muted" style={{ textAlign: "center" }}>Escolha <b>MeuPluggy</b> para trazer os bancos que você já conectou lá.</p>
      <PluggyConnect
        connectToken={token}
        language="pt"
        onSuccess={({ item }) => go({ itemId: item.id, banco: item.connector?.name ?? "" })}
        onError={(e) => go({ erro: e.message })}
        onClose={() => go({ fechou: "1" })}
      />
    </>
  );
}

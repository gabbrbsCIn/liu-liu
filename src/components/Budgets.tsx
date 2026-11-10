"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BudgetLine, BudgetStatus, BudgetView, GroupBudget } from "@/lib/budgets";
import { group } from "@/lib/categories";
import { BRL } from "@/lib/format";
import { txHref } from "@/lib/txFilter";
import { Icon } from "./Icon";
import { useTip } from "./useTip";

const STATUS: Record<Exclude<BudgetStatus, "none">, { label: string; cls: string }> = {
  ok: { label: "no ritmo", cls: "good" },
  pace: { label: "acima do ritmo", cls: "warn" },
  over: { label: "estourou", cls: "bad" },
};

const parseMoney = (s: string) => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Spent against the budget: fill in the category color, the part over the budget in red, a tick where the month's pace says you should be. */
function Meter({ l, color }: { l: BudgetLine; color: string }) {
  const tip = useTip();
  if (l.budget == null) return null;
  const scale = Math.max(l.budget, l.spent);
  const within = Math.min(l.spent, l.budget);
  const over = Math.max(0, l.spent - l.budget);
  return (
    <div className="chart" ref={tip.ref} onPointerOver={tip.onOver} onPointerLeave={tip.onLeave} style={{ marginTop: 0 }}>
      <div className="meter" role="img" aria-label={`${BRL(l.spent)} de ${BRL(l.budget)}`}>
        <i style={{ width: `${(within / scale) * 100}%`, background: color }} data-t={`Gasto: ${BRL(l.spent)}\nOrçamento: ${BRL(l.budget)}`} />
        {over > 0 && <i className="over" style={{ width: `${(over / scale) * 100}%` }} data-t={`Passou ${BRL(over)} do orçamento`} />}
        {l.expected != null && l.status !== "over" && <b className="pace" style={{ left: `${(l.expected / scale) * 100}%` }} data-t={`No seu ritmo de costume, até hoje: ${BRL(l.expected)}`} />}
      </div>
      {tip.node}
    </div>
  );
}

function Amount({ l, onSave, compact }: { l: BudgetLine; onSave: (v: number | null) => Promise<void>; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(l.budget ? String(l.budget).replace(".", ",") : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!editing)
    return l.budget == null ? (
      <button className="more" onClick={() => setEditing(true)}>
        <Icon name="plus" size={12} />
        {compact ? "orçar" : "definir orçamento"}
      </button>
    ) : (
      <button className="bgt-amt" onClick={() => setEditing(true)} title="Mudar orçamento">
        de <b className="n">{BRL(l.budget)}</b>
      </button>
    );
  const save = async (v: number | null) => {
    if (Number.isNaN(v)) return setErr("Digite um valor, ex.: 800");
    setBusy(true);
    setErr(null);
    try {
      await onSave(v);
      setEditing(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="inline-form bgt-form" onSubmit={(e) => { e.preventDefault(); save(parseMoney(value)); }}>
      <span className="faint" style={{ fontSize: 12.5 }}>R$</span>
      <input className="field" inputMode="decimal" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={l.suggestion ? String(Math.round(l.suggestion)) : "800"} aria-label={`Orçamento de ${l.label}`} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} />
      <button className="btn pri" disabled={busy}>Salvar</button>
      {l.suggestion > 0 && !value && <button type="button" className="more" onClick={() => setValue(String(Math.round(l.suggestion)))}>usar média ({BRL(Math.round(l.suggestion)).replace(",00", "")})</button>}
      {l.budget != null && <button type="button" className="more" onClick={() => save(null)} disabled={busy}>remover</button>}
      <button type="button" className="more" onClick={() => setEditing(false)}>cancelar</button>
      {err && <span className="err">{err}</span>}
    </form>
  );
}

function Status({ l, current }: { l: BudgetLine; current: boolean }) {
  if (l.status === "none") return null;
  const s = current ? STATUS[l.status] : l.status === "over" ? STATUS.over : { label: "dentro", cls: "good" };
  return <span className={`chg ${s.cls}`}>{s.label}</span>;
}

function Detail({ l, current }: { l: BudgetLine; current: boolean }) {
  if (l.budget == null) return <span className="faint">{l.suggestion > 0 ? `média dos últimos 3 meses: ${BRL(l.suggestion)}` : "sem gastos nos últimos 3 meses"}</span>;
  if (l.remaining! < 0) return <span>passou <b className="n neg">{BRL(-l.remaining!)}</b></span>;
  return (
    <span>
      {current ? "sobram" : "sobrou"} <b className="n">{BRL(l.remaining!)}</b>
      {current && l.perDay != null && <span className="faint"> · {BRL(l.perDay)}/dia até o fim do mês</span>}
    </span>
  );
}

export function Budgets({ v }: { v: BudgetView }) {
  const router = useRouter();
  const current = v.day != null;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const save = (group_key: string, sub_label = "") => async (amount: number | null) => {
    const r = await fetch("/api/budgets", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ group_key, sub_label, amount }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Não deu para salvar.");
    router.refresh();
  };
  const t = v.total;
  const budgeted = v.groups.filter((g) => g.budget != null || g.subs.some((s) => s.budget != null));
  const rest = v.groups.filter((g) => !budgeted.includes(g));

  const row = (g: GroupBudget) => {
    const meta = group(g.group_key);
    const isOpen = open.has(g.group_key);
    return (
      <div key={g.group_key} className="bgt">
        <div className="bgt-h">
          <span className="badge" style={{ background: meta.color }}>{meta.note ? `R$ ${meta.note}` : "···"}</span>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="bgt-top">
              <Link className="t1 sub-link" href={txHref({ ym: v.ym, kind: "out", cats: [g.group_key] })} title="Ver transações">{g.label}</Link>
              <Status l={g} current={current} />
              <span className="bgt-val"><b className="n">{BRL(g.spent)}</b> <Amount l={g} onSave={save(g.group_key)} /></span>
            </div>
            <Meter l={g} color={meta.color} />
            <div className="bgt-foot">
              <Detail l={g} current={current} />
              {g.subs.length > 0 && (
                <button className="more" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(g.group_key)) n.delete(g.group_key); else n.add(g.group_key); return n; })}>
                  {isOpen ? "esconder subcategorias" : `subcategorias (${g.subs.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
        {isOpen && (
          <div className="bgt-subs">
            {g.subs.map((s) => (
              <div key={s.key} className="bgt-sub">
                <div className="bgt-top">
                  <Link className="sub-link" href={txHref({ ym: v.ym, kind: "out", cats: [s.key] })}>{s.label}</Link>
                  <Status l={s} current={current} />
                  <span className="bgt-val"><b className="n">{BRL(s.spent)}</b> <Amount l={s} compact onSave={save(g.group_key, s.sub_label)} /></span>
                </div>
                <Meter l={s} color={`color-mix(in srgb, ${meta.color} 70%, transparent)`} />
                {s.budget != null && <div className="bgt-foot"><Detail l={s} current={current} /></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bento">
      <article className="p s12">
        {t.budget == null ? (
          <div>
            <span className="lbl">Orçamento do mês</span>
            <p style={{ margin: "8px 0 0", maxWidth: 620 }}>
              Defina quanto quer gastar por mês em cada categoria. O liu liu acompanha o ritmo e avisa quando uma categoria passar do ponto.
              A média dos últimos 3 meses aparece como sugestão.
            </p>
          </div>
        ) : (
          <>
            <div className="ph" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <span className="lbl">Orçamento do mês</span>
                <div className="big" style={{ fontSize: 34 }}>{BRL(t.spent)} <small>de {BRL(t.budget)}</small></div>
              </div>
              <Status l={t} current={current} />
            </div>
            <Meter l={t} color="var(--fg-2)" />
            <div className="bgt-foot" style={{ marginTop: 8 }}>
              <Detail l={t} current={current} />
              {current && t.expected != null && <span className="faint">tracinho: onde você costuma estar no dia {v.day}, pelo ritmo dos últimos 3 meses</span>}
            </div>
          </>
        )}
      </article>

      {budgeted.length > 0 && (
        <article className="p s12 plist">
          <div className="ph" style={{ padding: "16px 20px 4px" }}><span className="lbl">Com orçamento</span><span className="faint" style={{ fontSize: 12 }}>toque no valor para mudar</span></div>
          {budgeted.map(row)}
        </article>
      )}
      {rest.length > 0 && (
        <article className="p s12 plist">
          <div className="ph" style={{ padding: "16px 20px 4px" }}><span className="lbl">Sem orçamento</span></div>
          {rest.map(row)}
        </article>
      )}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, group } from "@/lib/categories";
import { normalize } from "@/lib/categorize";
import { Icon } from "./Icon";

export type CatOption = { group_key: string; label: string; custom: boolean };
export type CatValue = { group_key: string; label: string };

const TRANSFER: CatValue = { group_key: "transfer", label: "Entre suas contas" };
const INCOME = { key: "entrada", name: "Entradas", color: "var(--pos)" };

/**
 * Searchable category menu; typing a name that does not exist offers to create it inside a group.
 * Money out picks a spending category, money in an income one; both can be marked as a move between your accounts.
 */
export function CategoryPicker({ value, options, onChange, onCreate, direction = "out" }: { value: CatValue; options: CatOption[]; onChange: (v: CatValue) => void; onCreate: (v: CatValue) => Promise<void>; direction?: "in" | "out" }) {
  const income = direction === "in";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [newGroup, setNewGroup] = useState(income ? "entrada" : value.group_key !== "transfer" && value.group_key !== "entrada" ? value.group_key : "outros");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const nq = normalize(q);
  const mineSide = useMemo(() => options.filter((o) => (income ? o.group_key === "entrada" : o.group_key !== "entrada")), [options, income]);
  const groupName = (k: string) => (k === "entrada" ? INCOME.name : group(k).name);
  const filtered = useMemo(() => mineSide.filter((o) => !nq || normalize(`${o.label} ${groupName(o.group_key)}`).includes(nq)), [mineSide, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const exact = mineSide.some((o) => normalize(o.label) === nq);
  const mine = filtered.filter((o) => o.custom);

  const pick = (v: CatValue) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };

  const color = value.group_key === "transfer" ? "var(--line-2)" : value.group_key === "entrada" ? "var(--pos)" : group(value.group_key).color;

  return (
    <div className="cp" ref={ref}>
      <button type="button" className="cp-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <i className="cdot" style={{ background: color }} />
        <span className="grow t1" style={{ fontWeight: 500 }}>{value.label}</span>
        <span className="faint" style={{ fontSize: 12 }}>{value.group_key === "transfer" ? "entre contas" : value.group_key === "entrada" ? "entrada" : group(value.group_key).name}</span>
        <Icon name="chev" className="rot" size={14} />
      </button>
      {open && (
        <div className="cp-pop">
          <label className="search" style={{ minWidth: 0, margin: 8 }}>
            <Icon name="search" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ou digitar nova categoria…" onKeyDown={(e) => e.key === "Escape" && setOpen(false)} />
          </label>
          <div className="cp-list">
            {q.trim().length >= 2 && !exact && (
              <div className="cp-create">
                <span>Criar <b>“{q.trim()}”</b> em</span>
                {income ? (
                  <b>Entradas</b>
                ) : (
                  <select className="recat" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} aria-label="Grupo da nova categoria">
                    {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
                  </select>
                )}
                <button type="button" className="btn pri" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={async () => { const v = { group_key: newGroup, label: q.trim() }; await onCreate(v); pick(v); }}>Criar</button>
              </div>
            )}
            {mine.length > 0 && (
              <>
                <div className="cp-h">✦ Suas categorias</div>
                {mine.map((o) => <Opt key={`m${o.group_key}${o.label}`} o={o} on={o.group_key === value.group_key && o.label === value.label} onPick={pick} showGroup />)}
              </>
            )}
            {(income ? [INCOME] : GROUPS).map((g) => {
              const list = filtered.filter((o) => o.group_key === g.key && !o.custom);
              if (!list.length) return null;
              return (
                <div key={g.key}>
                  <div className="cp-h"><i className="cdot" style={{ background: g.color }} />{g.name}</div>
                  {list.map((o) => <Opt key={o.label} o={o} on={o.group_key === value.group_key && o.label === value.label} onPick={pick} />)}
                </div>
              );
            })}
            {(!nq || normalize("fora dos gastos das entradas entre suas contas transferencia").includes(nq)) && (
              <>
                <div className="cp-h">{income ? "Fora das entradas" : "Fora dos gastos"}</div>
                <button type="button" className={`cp-opt ${value.group_key === "transfer" ? "on" : ""}`} onClick={() => pick(TRANSFER)}>
                  Entre suas contas (não conta como {income ? "renda" : "gasto"})
                </button>
              </>
            )}
            {!filtered.length && exact === false && q.trim().length < 2 && <p className="faint" style={{ padding: "6px 14px" }}>Nada encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Opt({ o, on, onPick, showGroup }: { o: CatOption; on: boolean; onPick: (v: CatValue) => void; showGroup?: boolean }) {
  return (
    <button type="button" className={`cp-opt ${on ? "on" : ""}`} onClick={() => onPick({ group_key: o.group_key, label: o.label })}>
      {o.label}
      {showGroup && <span className="faint" style={{ fontSize: 11.5, marginLeft: 8 }}>{o.group_key === "entrada" ? "Entradas" : group(o.group_key).name}</span>}
    </button>
  );
}

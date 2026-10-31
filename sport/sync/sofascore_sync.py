#!/usr/bin/env python3
"""Baixa do SofaScore os jogos de um time num período e salva em JSON.

Uso pessoal: rode no seu próprio computador. As consultas vão devagar (uma a
cada 1,5 a 2,5 s) e tudo fica em cache, então rodar de novo só busca o que falta.

    python sofascore_sync.py --time "Sport Recife" --de 2009-01-01 --meus-jogos meus_jogos.txt
"""
import argparse
import asyncio
import json
import random
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

from sofascore_wrapper.api import SofascoreAPI

BRT = timezone(timedelta(hours=-3))
DETALHES = {
    "evento": "/event/{id}",
    "escalacoes": "/event/{id}/lineups",
    "lances": "/event/{id}/incidents",
    "estatisticas": "/event/{id}/statistics",
}


async def get(api, endpoint, tentativas=3):
    """GET no SofaScore com pausa entre consultas. Devolve None quando o dado não existe (404)."""
    for t in range(tentativas):
        await asyncio.sleep(1.5 + random.random())
        try:
            return await api._get(endpoint)
        except Exception as e:
            if "404" in str(e):
                return None
            if t == tentativas - 1:
                raise
            print(f"  falhou ({e}); tentando de novo em {15 * (t + 1)} s")
            await asyncio.sleep(15 * (t + 1))


async def achar_time(api, nome):
    r = await get(api, f"/search/all/?q={quote(nome)}&page=0") or {}
    times = [x["entity"] for x in r.get("results", [])
             if x.get("type") == "team" and x["entity"].get("sport", {}).get("slug") == "football"]
    if not times:
        sys.exit(f'Nenhum time encontrado para "{nome}".')
    print("Times encontrados (usando o primeiro; para outro, passe --time-id):")
    for t in times[:6]:
        print(f"  {t['id']:>8}  {t['name']} ({(t.get('country') or {}).get('name', '?')})")
    return times[0]["id"]


def resumo(e):
    dt = datetime.fromtimestamp(e["startTimestamp"], BRT)
    torneio = e.get("tournament") or {}
    unico = torneio.get("uniqueTournament") or {}
    return {
        "id": e["id"],
        "data": dt.date().isoformat(),
        "hora": dt.strftime("%H:%M"),
        "competicao": unico.get("name") or torneio.get("name"),
        "competicao_id": unico.get("id"),
        "temporada": (e.get("season") or {}).get("year"),
        "rodada": (e.get("roundInfo") or {}).get("round"),
        "mandante": e["homeTeam"]["name"],
        "mandante_id": e["homeTeam"]["id"],
        "visitante": e["awayTeam"]["name"],
        "visitante_id": e["awayTeam"]["id"],
        "gols_mandante": (e.get("homeScore") or {}).get("current"),
        "gols_visitante": (e.get("awayScore") or {}).get("current"),
        "status": (e.get("status") or {}).get("type"),
    }


async def listar_partidas(api, time_id, de, ate):
    """Percorre /team/{id}/events/last/{página}, da mais recente para a mais antiga."""
    partidas, pagina = {}, 0
    while pagina < 300:
        r = await get(api, f"/team/{time_id}/events/last/{pagina}")
        eventos = (r or {}).get("events") or []
        if not eventos:
            break
        datas = []
        for e in eventos:
            p = resumo(e)
            datas.append(p["data"])
            if de <= p["data"] <= ate:
                partidas[p["id"]] = p
        print(f"  página {pagina}: {min(datas)} a {max(datas)} ({len(partidas)} no período)")
        if max(datas) < de or not r.get("hasNextPage"):
            break
        pagina += 1
    return sorted(partidas.values(), key=lambda p: (p["data"], p["hora"]))


async def baixar_detalhes(api, partida, pasta):
    arq = pasta / f"{partida['id']}.json"
    if arq.exists():
        return json.loads(arq.read_text(encoding="utf-8"))
    d = {k: await get(api, ep.format(id=partida["id"])) for k, ep in DETALHES.items()}
    arq.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    return d


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).split()


LINHA = re.compile(r"^\W*Sport (\d+)x(\d+) (.+?) (\d{2})(?: e \d{2})?/(\d{2})/(\d{4})(\*)?\s*(.*)$")


def casar_meus_jogos(arquivo, partidas, time_id):
    """Liga cada linha da lista (ex.: 'Sport 2x1 Santos 24/11/2024') a uma partida do SofaScore."""
    saida = []
    for linha in Path(arquivo).read_text(encoding="utf-8").splitlines():
        m = LINHA.match(linha.strip())
        if not m:
            if linha.strip():
                saida.append({"linha": linha, "evento_id": None, "alerta": "linha fora do formato"})
            continue
        gp, gc, adv, d, mes, ano, estrela, obs = m.groups()
        dia = date(int(ano), int(mes), int(d))
        candidatos = []
        for p in partidas:
            dist = abs((date.fromisoformat(p["data"]) - dia).days)
            if dist > 1:
                continue
            casa = p["mandante_id"] == time_id
            outro = p["visitante"] if casa else p["mandante"]
            placar = (p["gols_mandante"], p["gols_visitante"]) if casa else (p["gols_visitante"], p["gols_mandante"])
            a0 = norm(adv)[0]
            nome_ok = any(t.startswith(a0) or a0.startswith(t) for t in norm(outro))
            placar_ok = placar == (int(gp), int(gc))
            if nome_ok or placar_ok:
                candidatos.append((not nome_ok, not placar_ok, dist, p, outro, placar))
        item = {"linha": linha, "top5": bool(estrela), "obs": obs, "evento_id": None, "alerta": None}
        if candidatos:
            sem_nome, sem_placar, dist, p, outro, placar = sorted(candidatos, key=lambda c: c[:3])[0]
            item["evento_id"] = p["id"]
            alertas = []
            if dist:
                alertas.append(f"data no SofaScore: {p['data']}")
            if sem_nome:
                alertas.append(f"adversário no SofaScore: {outro}")
            if sem_placar:
                alertas.append(f"placar no SofaScore: {placar[0]}x{placar[1]}")
            item["alerta"] = "; ".join(alertas) or None
        else:
            item["alerta"] = "não encontrado no SofaScore"
        saida.append(item)
    return saida


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--time", default="Sport Recife", help="nome do time para buscar")
    ap.add_argument("--time-id", type=int, help="id do time no SofaScore (pula a busca)")
    ap.add_argument("--de", default="2009-01-01", help="data inicial, AAAA-MM-DD")
    ap.add_argument("--ate", default=date.today().isoformat(), help="data final, AAAA-MM-DD")
    ap.add_argument("--meus-jogos", help="lista de jogos em que você foi, um por linha")
    ap.add_argument("--detalhes", choices=["meus", "todos", "nenhum"],
                    help="de quais partidas baixar escalação, lances e estatísticas (padrão: meus, ou nenhum sem --meus-jogos)")
    ap.add_argument("--saida", default="dados_sofascore", help="pasta de saída")
    a = ap.parse_args()

    saida = Path(a.saida)
    (saida / "partidas").mkdir(parents=True, exist_ok=True)
    api = SofascoreAPI()
    try:
        time_id = a.time_id or await achar_time(api, a.time)
        print(f"Listando partidas de {a.de} a {a.ate}…")
        partidas = await listar_partidas(api, time_id, a.de, a.ate)
        (saida / "partidas.json").write_text(json.dumps({"time_id": time_id, "partidas": partidas}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{len(partidas)} partidas salvas em {saida / 'partidas.json'}")

        meus = []
        if a.meus_jogos:
            meus = casar_meus_jogos(a.meus_jogos, partidas, time_id)
            (saida / "meus_jogos.json").write_text(json.dumps(meus, ensure_ascii=False, indent=1), encoding="utf-8")
            achados = [m for m in meus if m["evento_id"]]
            print(f"\nSua lista: {len(achados)} de {len(meus)} jogos encontrados no SofaScore.")
            for m in meus:
                if m["alerta"]:
                    print(f"  ! {m['linha'].strip()}  →  {m['alerta']}")

        modo = a.detalhes or ("meus" if a.meus_jogos else "nenhum")
        ids = {m["evento_id"] for m in meus if m["evento_id"]} if modo == "meus" else {p["id"] for p in partidas} if modo == "todos" else set()
        alvo = [p for p in partidas if p["id"] in ids]
        if alvo:
            print(f"\nBaixando detalhes de {len(alvo)} partidas (cerca de {len(alvo) * 8 // 60 + 1} min na primeira vez)…")
        for i, p in enumerate(alvo, 1):
            await baixar_detalhes(api, p, saida / "partidas")
            print(f"  {i}/{len(alvo)}  {p['data']}  {p['mandante']} {p['gols_mandante']}x{p['gols_visitante']} {p['visitante']}")
    finally:
        await api.close()
    print("\nPronto.")


if __name__ == "__main__":
    asyncio.run(main())

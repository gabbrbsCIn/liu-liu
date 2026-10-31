# Sincronizar com o SofaScore

O `sofascore_sync.py` baixa do SofaScore todas as partidas de um time num período, liga a sua lista de jogos (`meus_jogos.txt`) a essas partidas e guarda escalação, lances e estatísticas de cada uma. O resultado são arquivos JSON que o app importa.

Rode no seu computador. O SofaScore costuma bloquear servidores de nuvem, e o script usa um navegador Chromium escondido (via `sofascore-wrapper`) para as consultas.

## Primeira vez

Precisa de Python 3.9 ou mais novo.

macOS / Linux:

```bash
cd sport/sync
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Windows (PowerShell):

```powershell
cd sport\sync
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium
```

## Rodar

```bash
python sofascore_sync.py --time "Sport Recife" --de 2009-01-01 --meus-jogos meus_jogos.txt
```

Ele mostra os times encontrados e usa o primeiro. Se não for o Sport certo, rode de novo com `--time-id <id>`.

Opções:

- `--de` / `--ate`: período, no formato AAAA-MM-DD.
- `--detalhes meus|todos|nenhum`: de quais partidas baixar escalação, lances e estatísticas. O padrão é só os seus jogos.
- `--saida`: pasta de saída (padrão `dados_sofascore`).

A primeira execução leva uns 15 minutos: as consultas vão devagar de propósito. Depois tudo fica em cache e só o que falta é buscado.

## O que sai

- `dados_sofascore/partidas.json`: todas as partidas do time no período (data, competição, rodada, times, placar).
- `dados_sofascore/meus_jogos.json`: cada linha da sua lista com o id da partida no SofaScore e um alerta quando a data, o adversário ou o placar não bateram.
- `dados_sofascore/partidas/<id>.json`: detalhes de cada partida (evento, escalações, lances, estatísticas), do jeito que o SofaScore devolve.

No fim, o script lista as linhas com alerta. Confira essas.

## Se der erro

- **403 ou "Failed to fetch"**: o SofaScore bloqueou. Espere alguns minutos e rode de novo; o cache guarda o que já veio.
- **O wrapper parou de funcionar**: o `sofascore-wrapper` não é oficial e pode quebrar quando o SofaScore muda. Nesse caso o app usa a ESPN.

A pasta `dados_sofascore/` não vai para o git.

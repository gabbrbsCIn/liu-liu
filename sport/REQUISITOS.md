# Diário do Leão — requisitos (v0)

App pessoal para registrar os jogos do Sport que eu fui ver no estádio, guardar fotos e ver estatísticas de cada jogo e do conjunto. "Diário do Leão" é nome provisório.

Protótipo navegável: `design/prototipo.html` (abre direto no navegador, já com os 94 jogos).

## 1. Contexto de uso

- Um usuário só (eu). Uso no celular, no estádio ou na volta, para registrar o jogo e subir fotos; e no celular ou computador para ver estatísticas.
- Registrar um jogo tem que levar menos de 1 minuto: data, adversário e placar são obrigatórios; o resto pode ser completado depois.
- Interface em português, datas no formato dd/mm/aaaa.

## 2. Dados iniciais

94 jogos, de 12/07/2009 a 23/10/2026: 54 vitórias, 23 empates, 17 derrotas, 146 gols marcados e 86 sofridos.

Ajustes feitos na importação (precisam de confirmação, ver seção 8):

| Na lista | Como ficou |
|---|---|
| `Nautico`, `Gremio`, `Inter`, `Athletico`, `Atlético MG` / `Atlético-MG`, `Atlético GO`, `Botafogo SP` | Náutico, Grêmio, Internacional, Athletico-PR, Atlético-MG, Atlético-GO, Botafogo-SP |
| `Botafogo` e `Botafogo SP` | Clubes diferentes |
| `Sport 1x0 ABC 29 e 30/03/2023` | Data 29/03/2023, com anotação de que terminou em 30/03 |
| `público: 10.253` | Campo público = 10253 |
| `CAMPEAO PERNAMBUCANO`, `TRICAMPEÃO PERNAMBUCANO` | Tag **Título**, competição = Campeonato Pernambucano |
| `Final CNE` | Tag **Final**, competição = Copa do Nordeste |
| `Jogo de Acesso` | Tag **Acesso** |
| `MAGRÃO!!` | Tag **Despedida do Magrão** + anotação |
| `cdb sub 17` | Tag **Base · Sub-17**, competição = Copa do Brasil Sub-17 |
| `*` no fim da linha | Guardado como marcação (9 jogos), significado a confirmar |
| Jogos contra Náutico e Santa Cruz | Tag automática de clássico |

## 3. Modelo de dados

**Jogo**
- data (obrigatório), adversário (obrigatório), gols do Sport e do adversário (obrigatórios)
- competição, fase/rodada
- estádio, mando (casa/fora), setor onde fiquei
- público, com quem fui
- tags (Título, Final, Acesso, Clássico, Estreia, Despedida, Virada, Chuva…), anotação livre
- marcação `*` (enquanto o significado não for definido)
- fotos

**Foto**: jogo, arquivo, miniatura, legenda, data da foto (lida do EXIF quando houver), indicação de capa.

**Adversário**: nome oficial, apelidos usados na digitação (ex.: `Inter` → Internacional), se é clássico e qual (Clássico dos Clássicos, Clássico das Multidões).

**Listas que crescem com o uso**: estádios, setores, competições e acompanhantes. O que eu digitar uma vez vira sugestão na próxima.

## 4. Funcionalidades

### Jogos
- RF01. Listar jogos agrupados por temporada, mais recentes primeiro, com resumo da temporada (J, V, E, D, aproveitamento).
- RF02. Filtrar por texto (adversário, anotação, tag), resultado, ano, competição, estádio, setor, acompanhante e marcação `*`.
- RF03. Ver o detalhe do jogo como um ingresso: placar, data, competição, estádio, setor, público, com quem, tags, anotação, fotos e contexto (RF12).
- RF04. Registrar jogo novo com formulário curto; adversário com autocompletar.
- RF05. Editar e excluir jogo (exclusão pede confirmação na própria tela).
- RF06. Importar jogos colando texto no formato `Sport 2x1 Santos 24/11/2024 observação`, com prévia antes de salvar e aviso de linhas que não entendeu.
- RF07. Navegar para o jogo anterior e o próximo a partir do detalhe.

### Fotos
- RF08. Enviar várias fotos de uma vez pelo celular (câmera ou galeria), no detalhe do jogo e no formulário de registro.
- RF09. Gerar miniatura e reduzir o tamanho da foto antes de guardar; manter o original.
- RF10. Ver as fotos em tela cheia, deslizando entre elas; escolher a foto de capa do jogo.
- RF11. Galeria geral com todas as fotos, filtrável por ano e adversário.

### Estatísticas por jogo (contexto)
- RF12. No detalhe de cada jogo:
  - número do jogo na minha história (ex.: jogo nº 71 de 94);
  - retrospecto contra esse adversário até aquele dia, ou "primeira vez";
  - sequência invicta naquele momento;
  - dias desde o jogo anterior;
  - aproveitamento acumulado até aquele jogo.

### Estatísticas gerais
- RF13. Resumo: total de jogos, V/E/D, aproveitamento, gols marcados e sofridos, média de gols por jogo, primeiro e último jogo.
- RF14. Recordes: maior invencibilidade, maior sequência de vitórias, maior goleada, pior derrota, jogo com mais gols, jogos sem sofrer gol, retrospecto em clássicos.
- RF15. Adversários: tabela com J, V, E, D, gols, aproveitamento e últimos 5 resultados, ordenável por coluna; destaque para mais visto, "freguês" e "carrasco" (mínimo de 3 jogos).
- RF16. Por temporada: gráfico de barras V/E/D por ano (anos sem jogo aparecem vazios) e a mesma informação em tabela.
- RF17. Distribuições: dia da semana, placares mais comuns, por competição, por estádio, por setor, por acompanhante.
- RF18. Momentos: linha do tempo dos jogos com tags de destaque (títulos, finais, acesso, despedidas).

### Dados
- RF19. Exportar tudo em JSON e CSV (jogos) e um .zip com as fotos.

## 5. Definições das estatísticas

- **Aproveitamento** = (3 × V + E) / (3 × J).
- **Invencibilidade** = maior número de jogos seguidos sem derrota, na ordem das datas.
- **Freguês / carrasco** = maior e menor aproveitamento entre adversários com 3 jogos ou mais; empate desempata por número de jogos.
- Jogos de base (sub-17) entram nas contagens, com filtro para tirar (a confirmar, ver seção 8).
- Todas as estatísticas são só dos jogos em que eu estava, não do Sport no geral.

## 6. Requisitos não funcionais

- Mobile first; funcionar bem numa tela de 375 px. Tema claro e escuro.
- Acesso com senha única (app pessoal), como no liu liu.
- Fotos privadas: só acessíveis logado.
- Funcionar com internet ruim no estádio: o formulário guarda o rascunho e reenvia quando a conexão volta.
- Custo próximo de zero (plano gratuito de hospedagem, banco e armazenamento de fotos).
- Backup fácil (RF19).

## 7. Proposta técnica (para discutir)

Mesmo stack do liu liu, para reaproveitar o que já existe neste repositório:

- **Next.js 15** (App Router) com páginas renderizadas no servidor.
- **Postgres** (Neon/Supabase) em produção e PGlite no desenvolvimento.
- **Vercel Blob** para fotos e miniaturas.
- Login por senha única (`APP_PASSWORD`), reaproveitando `src/lib/auth.ts` e `src/lib/loginLimit.ts`.
- PWA para instalar na tela inicial do celular.
- Estatísticas calculadas no servidor a partir da tabela de jogos (são poucas centenas de linhas, não precisa de cache).

Decisão em aberto: projeto separado ou pasta `sport/` dentro deste repositório.

## 8. Perguntas em aberto

1. O que significa o `*` em 9 jogos (16/07/2014, 20/06/2015, 12/07/2015, 02/08/2015, 26/08/2015, 30/08/2015, 29/11/2015, 04/06/2016, 16/04/2017)?
2. Todos os jogos foram na Ilha do Retiro? Teve algum na Arena de Pernambuco, no Arruda, nos Aflitos ou fora de Recife?
3. `Sport 2x2 São Paulo 16/05/2025` está entre 02/08 e 21/09/2025 na lista. A data certa é 16/05 ou outra (16/08?)?
4. Posso preencher a competição de cada jogo a partir de fontes públicas (com sua revisão), ou você prefere preencher?
5. O jogo sub-17 de 24/05/2016 entra nas estatísticas gerais?
6. Quais setores você costuma usar? Isso vira a lista inicial de sugestões.
7. Quer registrar com quem foi em cada jogo? Ajuda a montar estatísticas tipo "aproveitamento indo com o pai".

## 9. Ideias para depois da v1

- Buscar dados oficiais do jogo (escalação, autores dos gols, árbitro) numa API de futebol.
- Índice "pé-quente": comparar meu aproveitamento com o do Sport na mesma temporada.
- Mapa dos setores da Ilha do Retiro com quantas vezes fiquei em cada um.
- Foto do ingresso com leitura automática de data, setor e preço.
- Card do jogo para compartilhar (placar + foto + "meu 95º jogo").

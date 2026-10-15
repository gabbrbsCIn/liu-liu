# liu liu (app Android/iOS)

App nativo em Expo (React Native) que conversa com o servidor Next.js da raiz do repositório. O servidor continua fazendo tudo o que precisa de segredo: Pluggy, Ollama, Postgres, webhook e cron. O app só mostra e edita os dados pela API.

## Como o app fala com o servidor

- **Login:** o app pede o endereço do servidor e a `APP_PASSWORD`. O `/api/login` devolve o mesmo token do cookie do site, e o app o guarda no Keychain/Keystore e manda como `Authorization: Bearer`. Trocar a senha desconecta o celular também.
- **Dados:** `/api/app/*` (`session`, `overview`, `transactions`, `categories`, `cards`, `installments`, `investments`) devolve em JSON o mesmo que as páginas do site montam (`src/lib/views.ts`). Para editar, o app usa as rotas que já existiam (`/api/transactions`, `/api/categories`, `/api/settings`, `/api/chat`, `/api/sync`, `/api/pluggy/*`).
- **Código compartilhado:** datas, formatação, categorias, filtros de transações e investimentos vêm direto de `../src/lib` (alias `@shared/`). Os tipos das respostas saem das próprias funções do servidor (`src/lib/types.ts`), então uma mudança no servidor quebra o typecheck do app em vez de quebrar em produção.
- **Conectar banco:** o widget da Pluggy abre no navegador do sistema, na página `/conectar` do servidor, porque os popups e o OAuth do MeuPluggy não funcionam bem dentro de um WebView. No fim, a página volta para o app por `liuliu://conectado?itemId=…`, e o app importa o item.
- **Links do chat:** as rotas do app têm os mesmos caminhos do site (`/transacoes?cat=alim`, `/categorias?m=…`), então os links que o liu liu manda funcionam no app.

## Rodar no computador

```bash
# na raiz: servidor com dados de exemplo
LIU_TODAY=2026-09-28 npm run seed:demo
npm run dev

# em outro terminal
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --web   # abre no navegador
```

Para testar no celular pelo Expo Go, use o IP do computador na rede (`http://192.168.x.x:3000`) como servidor.

`npx tsc --noEmit` checa o app inteiro, inclusive os tipos que vêm do servidor. Para isso, a raiz também precisa de `npm install`.

## Gerar o APK e o IPA (GitHub Actions)

O workflow `.github/workflows/mobile.yml` roda o typecheck a cada push que mexe no app. Os builds rodam sob demanda, em **Actions › App (Android e iOS) › Run workflow**:

- **Android:** gera `liuliu.apk`, assinado com a chave de debug. Instala em qualquer Android que permita "instalar apps desconhecidos", mas não serve para a Play Store.
- **iOS:** gera `liuliu.ipa` sem assinatura. Instale pelo Sideloadly ou AltStore com o seu Apple ID. Com conta gratuita, é preciso reinstalar a cada 7 dias.

Antes do build, defina a variável de repositório `API_URL` (*Settings › Secrets and variables › Actions › Variables*) com o endereço do servidor. Ele vem preenchido na tela de login.

Para publicar nas lojas, troque o CI pelo EAS (`npx eas-cli build`), que cuida das assinaturas. Isso exige conta Apple Developer (US$ 99/ano) e Google Play (US$ 25, uma vez só).

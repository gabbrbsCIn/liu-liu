// Shapes of the server's JSON, taken straight from the functions that build them (type-only imports:
// nothing from the server is bundled into the app).
import type { homeView, categoriesView, installmentsScreen, session, transactionsView } from '@shared/views';
import type { cardsView, investmentsView } from '@shared/queries';
import type { TxFilter } from '@shared/txFilter';

type Data<F extends (...a: never[]) => unknown> = Awaited<ReturnType<F>>;
type WithToday<T> = T & { today: string };

export type { AccountOption, TxView } from '@shared/views';
export type { CategoryOption } from '@shared/actions';
export type { GroupTotal, InstallmentPlan } from '@shared/finance';
export type { PositionGroup } from '@shared/investments';
export type { AccountRow } from '@shared/queries';

export type SessionData = Data<typeof session> & { pluggyConfigured: boolean };
export type HomeData = WithToday<Data<typeof homeView>>;
export type Overview = Extract<HomeData, { empty: false }>;
export type TransactionsData = WithToday<Data<typeof transactionsView> & { filter: TxFilter }>;
export type CategoriesData = WithToday<Data<typeof categoriesView>>;
export type CardsData = WithToday<{ holder: string; cards: Data<typeof cardsView> }>;
export type InstallmentsData = WithToday<Data<typeof installmentsScreen>>;
export type InvestmentsData = WithToday<Data<typeof investmentsView>>;

export type ChatMessage = { role: 'user' | 'assistant'; display: string; created_at: string };
export type Conversation = { id: string; title: string; updated_at: string; messages: number };
export type ChatData = { conversation: string; messages: ChatMessage[]; conversations: Conversation[] };
export type ChatReply = { reply: string; changed?: boolean; conversation: string };

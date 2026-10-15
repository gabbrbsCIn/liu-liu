import { TxList } from "@/components/TxList";
import { today } from "@/lib/dates";
import { parseFilter } from "@/lib/txFilter";
import { transactionsView } from "@/lib/views";

export const metadata = { title: "Transações · liu liu" };

export default async function Transactions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filter = parseFilter(await searchParams, today());
  const { txs, accounts, options } = await transactionsView(filter);
  return <TxList txs={txs} today={today()} accounts={accounts} options={options} filter={filter} />;
}

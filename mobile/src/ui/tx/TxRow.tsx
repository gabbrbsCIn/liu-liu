import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { BRL } from '@shared/format';
import type { TxView } from '@/lib/types';
import { BankTile, Dot, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { groupMeta } from './common';

function Badge({ children, plain }: { children: React.ReactNode; plain?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: plain ? t['raise-2'] : t['mint-dim'] }}>
      <T c={plain ? 'fg-2' : 'mint'} size={10.5} style={{ lineHeight: 15 }}>{children}</T>
    </View>
  );
}

/** One transaction in the list (.tx): description and badges, account and note, category, amount. */
export const TxRow = memo(function TxRow({ tx, first, last, onPress }: { tx: TxView; first: boolean; last: boolean; onPress: (tx: TxView) => void }) {
  const t = useTheme();
  const g = groupMeta(tx.group_key);
  return (
    <Pressable
      onPress={() => onPress(tx)}
      accessibilityHint="Ver e editar"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14,
        backgroundColor: pressed ? t.raise : t.panel, borderColor: t.line, borderLeftWidth: 1, borderRightWidth: 1,
        borderTopWidth: 1, borderBottomWidth: last ? 1 : 0,
        borderTopLeftRadius: first ? 14 : 0, borderTopRightRadius: first ? 14 : 0,
        borderBottomLeftRadius: last ? 14 : 0, borderBottomRightRadius: last ? 14 : 0,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4, opacity: tx.excluded ? (tx.hidden ? 0.4 : 0.55) : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <T w="medium" numberOfLines={1} style={{ flexShrink: 1 }}>{tx.description}</T>
          {tx.source === 'chat' && <Badge>anotado na conversa</Badge>}
          {tx.source === 'manual' && <Badge>criada por você</Badge>}
          {tx.hidden && <Badge plain>oculta</Badge>}
          {tx.edited && <Badge plain>editada</Badge>}
          {tx.installment && <Badge plain>{tx.installment}</Badge>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BankTile name={tx.account.name} color={tx.account.color} small />
          <T c="fg-3" size={12} numberOfLines={1} style={{ flexShrink: 1 }}>
            {tx.account.name}{tx.account.type === 'CREDIT' ? ' · crédito' : ''}{tx.note ? ` · ${tx.note}` : ''}
          </T>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: '45%', opacity: tx.excluded ? (tx.hidden ? 0.4 : 0.55) : 1 }}>
        <T c={tx.direction === 'in' ? 'pos' : 'fg'} w="semi" mono>{tx.direction === 'in' ? '+ ' : '− '}{BRL(tx.amount)}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
          <Dot color={t.color(g.color)} />
          <T c="fg-2" size={12} numberOfLines={1} style={{ flexShrink: 1 }}>{tx.sub_label}</T>
        </View>
      </View>
    </Pressable>
  );
});

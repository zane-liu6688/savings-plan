import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { Screen, Card, LabeledInput, AddButton, CardItem, ResultBox, Stat } from '../components/ui';
import { useStore, useComputed } from '../store';
import { colors, currency } from '../theme';

const pct = (v: number, base: number): string => (base > 0 ? Math.max(0, (v / base) * 100).toFixed(0) : '0');

export default function ExpensesScreen() {
  const expenses = useStore((s) => s.expenses);
  const addExpense = useStore((s) => s.addExpense);
  const delExpense = useStore((s) => s.delExpense);
  const assets = useStore((s) => s.assets);
  const addAsset = useStore((s) => s.addAsset);
  const delAsset = useStore((s) => s.delAsset);
  const r = useComputed();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [toolName, setToolName] = useState('');
  const [cost, setCost] = useState('');
  const [days, setDays] = useState('365');
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  const onAddExpense = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('提示', '请填写正确的开销金额！');
      return;
    }
    addExpense({ name: name.trim() || '生活杂项', amount: amt });
    setName(''); setAmount('');
  };

  const onAddAsset = () => {
    const c = parseFloat(cost);
    const d = parseInt(days, 10);
    if (isNaN(c) || c <= 0 || isNaN(d) || d <= 0) {
      Alert.alert('提示', '请填写工具价格和分摊天数！');
      return;
    }
    addAsset({ name: toolName.trim() || '未命名工具', cost: c, prop: 100, days: d });
    setToolName(''); setCost(''); setDays('365');
  };

  return (
    <Screen>
      <Card title="🏠 每月固定生活开销" accent="green">
        <Text style={styles.note}>
          小提示：实际交的个税、五险一金（养老 / 医疗 / 失业 / 公积金）都算你自己的钱出去了，建议在这里各加一项（例：交个税 500、社保公积金 840）。App 不会自动扣税，你按真实金额记进来，攒钱数才准。
        </Text>
        <LabeledInput
          label="消费类目名称"
          placeholder="例：房租 / 吃饭买菜 / 交通话费"
          value={name}
          onChange={setName}
          flex={2}
        />
        <View style={[styles.row, isSmall && styles.rowCol]}>
          <LabeledInput label="每月金额 (元)" placeholder="金额" value={amount} onChange={setAmount} keyboardType="numeric" />
          <AddButton title="添加开销" onPress={onAddExpense} color={colors.green} />
        </View>
      </Card>

      <Card title="📋 每月开销明细" accent="green">
        {expenses.length === 0 ? (
          <Text style={styles.empty}>还没有添加生活开销</Text>
        ) : (
          expenses.map((e) => (
            <CardItem
              key={e.id}
              title={e.name}
              lines={[
                `每月 ${currency(e.amount)} → 全年 ${currency(e.amount * 12)}`,
                `占每月开销 ${pct(e.amount, r.totalExpMonth)}%`,
              ]}
              onDelete={() => delExpense(e.id)}
            />
          ))
        )}
        <ResultBox accent="green">
          <Stat label="每月固定生活总支出:" value={currency(r.totalExpMonth)} bold />
          <Stat label="全年生活总支出:" value={currency(r.totalExpMonth * 12)} bold />
          <Stat label="平摊每天生活成本:" value={currency(r.totalExpDay)} color={colors.red} bold />
          <Stat label="你每天能赚:" value={currency(r.grossDay)} color={colors.primary} bold />
          <Stat label="生活开销占日收入:" value={`${pct(r.totalExpDay, r.grossDay)}%`} color={colors.amberDark} bold />
        </ResultBox>
      </Card>

      <Card title="🛠 工作工具/设备成本分摊（可选）" accent="amber">
        <Text style={styles.note}>
          买电动车、手机、电脑这些为了工作买的工具，金额可以分摊到每天算进成本里。不填也不影响。
        </Text>
        <LabeledInput
          label="工具名称"
          placeholder="例：送外卖电动车 / 工作用手机"
          value={toolName}
          onChange={setToolName}
          flex={2}
        />
        <View style={[styles.row, isSmall && styles.rowCol]}>
          <LabeledInput label="总价 (元)" placeholder="价格" value={cost} onChange={setCost} keyboardType="numeric" />
          <LabeledInput label="分摊多少天" placeholder="天数" value={days} onChange={setDays} keyboardType="numeric" />
        </View>
        <AddButton title="添加工具成本" onPress={onAddAsset} color={colors.amber} />
      </Card>

      <Card title="已添加的工具分摊" accent="amber">
        {assets.length === 0 ? (
          <Text style={styles.empty}>还没有添加工具成本</Text>
        ) : (
          assets.map((a) => (
            <CardItem
              key={a.id}
              title={a.name}
              lines={[`总价 ${currency(a.cost)} / ${a.days}天`, `每天摊 ${currency(a.cost / (a.days > 0 ? a.days : 1))}`]}
              onDelete={() => delAsset(a.id)}
            />
          ))
        )}
        <ResultBox accent="amber">
          <Stat label="工具每日摊销:" value={currency(r.totalWorkDayCost)} color={colors.red} bold />
        </ResultBox>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' },
  rowCol: { flexDirection: 'column', alignItems: 'stretch' },
  note: { fontSize: 13, color: colors.sub, marginBottom: 12, lineHeight: 20 },
  empty: { color: colors.sub, paddingVertical: 10 },
});

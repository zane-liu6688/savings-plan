import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Screen, Card, LabeledInput, AddButton, CardItem, ResultBox, Stat } from '../components/ui';
import { useStore, useComputed } from '../store';
import { colors, currency } from '../theme';
import type { SalaryType } from '../types';

export default function JobsScreen() {
  const jobs = useStore((s) => s.jobs);
  const addJob = useStore((s) => s.addJob);
  const delJob = useStore((s) => s.delJob);
  const expenses = useStore((s) => s.expenses);
  const addExpense = useStore((s) => s.addExpense);
  const r = useComputed();

  const round2 = (n: number) => Math.round(n * 100) / 100;

  // 把「参考税费」一键写成开销（金额之后可自己改成真实值）
  const onRecordTax = () => {
    const taxMonthly = r.taxRefYear / 12;
    const socialGross = r.socialYear / 12;
    const fundMonthly = r.housingFundYear / 12;
    const socialReal = Math.max(0, socialGross - fundMonthly);
    const exists = (n: string) => expenses.some((e) => e.name === n);
    const added: string[] = [];

    if (socialReal > 0 && !exists('五险一金（养老/医疗统筹/失业）')) {
      addExpense({ name: '五险一金（养老/医疗统筹/失业）', amount: round2(socialReal) });
      added.push('五险一金');
    }
    if (taxMonthly > 0 && !exists('个人所得税')) {
      addExpense({ name: '个人所得税', amount: round2(taxMonthly) });
      added.push('个人所得税');
    }

    Alert.alert(
      added.length ? '已记进「生活」开销' : '已经记过了',
      added.length
        ? `已添加：${added.join('、')}。\n\n金额是按参考值估的，等你实际交了税，去「生活」页改成真实数字就行。${
            fundMonthly > 0 ? `\n\n公积金 ${currency(fundMonthly)}/月 没有算进花销——那是你自己的钱。` : ''
          }`
        : '「生活」里已经有同名开销了，直接去改金额即可。'
    );
  };

  const [name, setName] = useState('');
  const [type, setType] = useState<SalaryType>('month');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');

  const onAdd = () => {
    const amt = parseFloat(amount);
    const dur = parseInt(duration, 10);
    if (isNaN(amt) || amt <= 0 || isNaN(dur) || dur <= 0) {
      Alert.alert('提示', '请完整填写收入数额和时长！');
      return;
    }
    addJob({ name: name.trim() || '未命名收入', type, amount: amt, duration: dur });
    setName(''); setAmount(''); setDuration('');
  };

  return (
    <Screen>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>你平均每天能赚</Text>
        <Text style={styles.heroNum}>{currency(r.grossDay)}</Text>
        <Text style={styles.heroSub}>
          全年收入 {currency(r.grossYear)} 摊到 365 天 · 每月 {currency(r.grossMonth)}
        </Text>
        <Text style={styles.heroHint}>
          记住这个数字：买东西前除以「能用的天数」，就知道每天要多赚多少才不超支。
        </Text>
      </View>

      <Card title="💰 收入录入 (工资 + 兼职可叠加)">
        <LabeledInput label="收入来源名称" placeholder="例：工资 / 兼职 / 副业" value={name} onChange={setName} flex={2} />
        <View style={styles.seg}>
          <SegBtn label="按月(月薪)" active={type === 'month'} onPress={() => setType('month')} />
          <SegBtn label="按天(日薪)" active={type === 'day'} onPress={() => setType('day')} />
        </View>
        <View style={styles.row}>
          <LabeledInput label="税前金额 (元)" placeholder="输入金额" value={amount} onChange={setAmount} keyboardType="numeric" />
          <LabeledInput
            label={type === 'month' ? '干多少个月' : '干多少天'}
            placeholder="月数/天数"
            value={duration}
            onChange={setDuration}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.tipNote}>
          收入会变（加班、换工作）？分几段分别录就行：比如「1-5月 8000，6-12月 10000」，App 会自动加起来算平均每天能赚多少。
        </Text>
        <AddButton title="➕ 添加这笔收入" onPress={onAdd} />
      </Card>

      <Card title="📋 已录入的收入明细" accent="green">
        {jobs.length === 0 ? (
          <Text style={styles.empty}>还没有添加收入</Text>
        ) : (
          jobs.map((j) => {
            const unit = j.type === 'month' ? '月' : '天';
            const gross = j.amount * j.duration;
            return (
              <CardItem
                key={j.id}
                title={j.name}
                lines={[`${currency(j.amount)}/${unit} × ${j.duration}${unit}`, `税前合计 ${currency(gross)}`]}
                onDelete={() => delJob(j.id)}
              />
            );
          })
        )}
        <ResultBox accent="green">
          <Stat label="💼 全年总收入:" value={currency(r.grossYear)} bold />
          <Stat label="📅 平均每月收入:" value={currency(r.grossMonth)} bold />
          <Stat label="🔹 摊平到每天收入:" value={currency(r.grossDay)} bold />
        </ResultBox>

        <ResultBox accent="amber">
          <Text style={styles.tipTitle}>💡 下面只是「预估税费」，随便看看就行</Text>
          <Stat label="五险一金(预估):" value={currency(r.socialYear)} color={colors.amberDark} />
          <Stat label="其中公积金(仍是你的钱):" value={currency(r.housingFundYear)} color={colors.primary} />
          <Stat label="专项附加扣除:" value={currency(r.specialYear)} color={colors.amberDark} />
          <Stat label="个税(预估，全年):" value={currency(r.taxRefYear)} color={colors.red} bold />
          <Stat label="预估税后(每月):" value={currency(r.netRefMonth)} color={colors.green} />
          <Stat label="预估税率档:" value={`${(r.marginalRate * 100).toFixed(0)}%`} color={colors.sub} />
          <Text style={styles.tipNote}>
            这些数字是按你上面填的收入、用公开税率粗算的，加班多、收入变了它就会跟着变。估得不准也没关系——它一分钱都不会影响你的攒钱计算。
            {'\n'}真实情况是：实际被扣了多少，就去「生活」页照实填一项开销（名字自己写清楚，比如「个人所得税」「五险一金」「医保」），这样账才是真的。
          </Text>
          <View style={{ marginTop: 12 }}>
            <AddButton title="懒得手填？把预估金额先填进开销（之后可改）" onPress={onRecordTax} color={colors.amber} />
          </View>
        </ResultBox>
      </Card>
    </Screen>
  );
}

const SegBtn: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.segBtn,
      { backgroundColor: active ? colors.primary : colors.divider },
      pressed && { opacity: 0.85 },
    ]}
    onPress={onPress}
    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
  >
    <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  seg: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  segBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  empty: { color: colors.sub, paddingVertical: 10 },
  tipTitle: { fontSize: 14, fontWeight: '800', color: colors.amberDark, marginBottom: 6 },
  tipNote: { fontSize: 12, color: colors.sub, marginTop: 8, lineHeight: 18 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
  },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  heroNum: { color: '#fff', fontSize: 38, fontWeight: '900', marginVertical: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
    textAlign: 'center',
  },
});

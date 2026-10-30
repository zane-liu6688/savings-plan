import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { Screen, Card, LabeledInput, AddButton, CardItem, ResultBox, Stat } from '../components/ui';
import { useStore, useComputed } from '../store';
import { colors, currency } from '../theme';
import { DEFAULT_SOCIAL_RATE, BASIC_DEDUCTION_YEAR } from '../engine/tax';

// 常见专项附加扣除标准（2024 年起，单位：元/月）
const PRESETS: { name: string; monthly: number }[] = [
  { name: '住房租金', monthly: 1500 },
  { name: '住房贷款利息', monthly: 1000 },
  { name: '子女教育', monthly: 2000 },
  { name: '赡养老人', monthly: 3000 },
  { name: '继续教育', monthly: 400 },
  { name: '婴幼儿照护', monthly: 2000 },
];

export default function DeductionsScreen() {
  const r = useComputed();
  const socialMonthly = useStore((s) => s.socialMonthly);
  const setSocialMonthly = useStore((s) => s.setSocialMonthly);
  const housingFundMonthly = useStore((s) => s.housingFundMonthly);
  const setHousingFundMonthly = useStore((s) => s.setHousingFundMonthly);
  const deductions = useStore((s) => s.specialDeductions);
  const addDeduction = useStore((s) => s.addDeduction);
  const delDeduction = useStore((s) => s.delDeduction);

  const [socialText, setSocialText] = useState(socialMonthly > 0 ? String(socialMonthly) : '');
  const [fundText, setFundText] = useState(housingFundMonthly > 0 ? String(housingFundMonthly) : '');
  const [name, setName] = useState('');
  const [monthly, setMonthly] = useState('');
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  const onSocialChange = (t: string) => {
    setSocialText(t);
    const v = parseFloat(t);
    setSocialMonthly(!isNaN(v) && v > 0 ? v : 0);
  };

  const onFundChange = (t: string) => {
    setFundText(t);
    const v = parseFloat(t);
    setHousingFundMonthly(!isNaN(v) && v > 0 ? v : 0);
  };

  const showSocialTip = () => {
    Alert.alert(
      '五险一金怎么填？',
      `按你工资条上「个人缴纳」那一栏的合计填写（养老 + 医疗 + 失业 + 公积金）。\n\n留空或填 0 时，按税前月收入 × ${(DEFAULT_SOCIAL_RATE * 100).toFixed(1)}% 自动估算。`,
    );
  };

  const onAddPreset = (p: { name: string; monthly: number }) => {
    if (deductions.some((d) => d.name === p.name)) {
      Alert.alert('已添加', `「${p.name}」已经在列表里了`);
      return;
    }
    addDeduction(p);
  };

  const onAddCustom = () => {
    const m = parseFloat(monthly);
    if (!name.trim() || isNaN(m) || m <= 0) {
      Alert.alert('提示', '请填写扣除项目名称和每月金额！');
      return;
    }
    addDeduction({ name: name.trim(), monthly: m });
    setName(''); setMonthly('');
  };

  const autoSocial = (r.grossYear / 12) * DEFAULT_SOCIAL_RATE;

  return (
    <Screen>
      <Card title="🏥 五险一金（个人缴纳部分）" accent="amber">
        <Text style={styles.note}>
          在工资条上找「个人缴纳」合计金额填进来。这里只是用来估算税费参考值，不会自动从收入里扣钱。
        </Text>
        <View style={[styles.row, isSmall && styles.rowCol]}>
          <LabeledInput
            label="每月个人缴纳 (元)"
            placeholder={`留空 = 自动按 ${(DEFAULT_SOCIAL_RATE * 100).toFixed(1)}% 估算`}
            value={socialText}
            onChange={onSocialChange}
            keyboardType="numeric"
          />
          <Pressable
            style={({ pressed }) => [styles.tipBtn, pressed && styles.pressed]}
            onPress={showSocialTip}
          >
            <Text style={styles.tipBtnText}>怎么填？</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {socialMonthly > 0
            ? `当前：手填 ${currency(socialMonthly)}/月`
            : `当前：自动估算 ${currency(autoSocial)}/月（按 10.5%）`}
        </Text>

        <View style={styles.sep} />
        <LabeledInput
          label="其中：公积金个人缴纳 (元/月)"
          placeholder="这部分仍是你的钱（买房 / 租房可提取）"
          value={fundText}
          onChange={onFundChange}
          keyboardType="numeric"
        />
        <Text style={styles.hint}>
          {housingFundMonthly > 0
            ? `公积金 ${currency(housingFundMonthly)}/月（全年 ${currency(housingFundMonthly * 12)}）在你名下，不算真花掉`
            : '公积金那笔钱其实还在你名下，填一下可以从"真花掉的钱"里减掉'}
        </Text>
      </Card>

      <Card title="🧾 个税专项附加扣除" accent="green">
        <Text style={styles.note}>
          按你实际符合的项目添加，用来看「大概能少交多少税」作参考。标准金额已按国家规定预填，可按需改。真实交税请到「生活」页记一笔开销。
        </Text>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.name}
              style={({ pressed }) => [styles.preset, pressed && styles.pressed]}
              onPress={() => onAddPreset(p)}
            >
              <Text style={styles.presetName}>{p.name}</Text>
              <Text style={styles.presetVal}>{currency(p.monthly)}/月</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sep} />
        <Text style={styles.subTitle}>自定义添加</Text>
        <View style={[styles.row, isSmall && styles.rowCol]}>
          <LabeledInput label="项目名称" placeholder="例：大病医疗" value={name} onChange={setName} flex={2} />
          <LabeledInput label="每月金额 (元)" placeholder="金额" value={monthly} onChange={setMonthly} keyboardType="numeric" />
        </View>
        <AddButton title="添加这项扣除" onPress={onAddCustom} color={colors.green} />
      </Card>

      <Card title="📋 已添加的扣除项目" accent="primary">
        {deductions.length === 0 ? (
          <Text style={styles.empty}>还没有添加专项附加扣除</Text>
        ) : (
          deductions.map((d) => (
            <CardItem
              key={d.id}
              title={d.name}
              lines={[`每月 ${currency(d.monthly)} → 全年 ${currency(d.monthly * 12)}`]}
              onDelete={() => delDeduction(d.id)}
            />
          ))
        )}
        <ResultBox accent="primary">
          <Text style={styles.resultTitle}>💡 以下都是参考值，不参与攒钱计算</Text>
          <Stat label="每月扣除合计:" value={currency(r.socialYear / 12 + r.specialYear / 12)} bold />
          <Stat label="全年扣除合计:" value={currency(r.deductionYear)} bold />
          <Stat label="基本减除费用(起征点):" value={`${currency(BASIC_DEDUCTION_YEAR)}/年`} color={colors.sub} />
          <Stat label="应纳税所得额:" value={currency(r.taxableYear)} color={colors.amber} bold />
          <Stat label="参考个税(全年):" value={currency(r.taxRefYear)} color={colors.red} bold />
          <Stat label="参考税后(每月):" value={currency(r.netRefMonth)} color={colors.green} bold />
          <Stat label="参考税率档:" value={`${(r.marginalRate * 100).toFixed(0)}%`} color={colors.sub} />
        </ResultBox>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  rowCol: { flexDirection: 'column', alignItems: 'stretch' },
  note: { fontSize: 13, color: colors.sub, marginBottom: 12, lineHeight: 20 },
  hint: { fontSize: 13, color: colors.primaryDark, fontWeight: '700', marginTop: 4 },
  subTitle: { fontSize: 14, fontWeight: '800', color: colors.textStrong, marginBottom: 10 },
  resultTitle: { fontSize: 13, fontWeight: '800', color: colors.primaryDark, marginBottom: 6 },
  sep: { height: 1, backgroundColor: colors.divider, marginVertical: 14 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: {
    backgroundColor: colors.greenBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  presetName: { fontSize: 14, fontWeight: '700', color: colors.textStrong },
  presetVal: { fontSize: 12, color: colors.greenDark, marginTop: 2 },
  tipBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tipBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.8 },
  empty: { color: colors.sub, paddingVertical: 10 },
});

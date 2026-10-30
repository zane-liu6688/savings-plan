import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { Screen, Card, ResultBox, Tile, Stat, RatioBar } from '../components/ui';
import { useStore, useComputed } from '../store';
import { colors, currency } from '../theme';

const DAYS_IN_MONTH = 30.4167;

const pct = (v: number, base: number): string => (base > 0 ? Math.max(0, (v / base) * 100).toFixed(0) : '0');

export default function DashboardScreen() {
  const r = useComputed();
  const resetAll = useStore((s) => s.resetAll);
  const addYear = useStore((s) => s.addYear);
  const delYear = useStore((s) => s.delYear);

  const [yearLabel, setYearLabel] = useState('');
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  const onReset = () => {
    Alert.alert('清空并重置', '确定要清空所有自定义数据并恢复默认状态吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定重置', style: 'destructive', onPress: resetAll },
    ]);
  };

  const onAddYear = () => {
    const label = yearLabel.trim();
    if (!label) {
      Alert.alert('提示', '请输入年份标签，如 2026 或 2027');
      return;
    }
    addYear(label);
    setYearLabel('');
  };

  const disposable = r.finalDailyDisposable;
  const safe = disposable >= 0;

  return (
    <Screen>
      {/* 顶部核心看板 */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>今日可自由支配</Text>
        <Text style={[styles.heroNum, { color: safe ? colors.green : colors.red }]}>
          {currency(disposable)}
        </Text>
        <Text style={styles.heroFormula}>每天实际能攒的钱 − 每天必须攒下的目标</Text>
        <Text style={[styles.status, { color: safe ? colors.greenDark : colors.redDark }]}>
          {safe
            ? `很稳！先存够今天该存的 ${currency(r.goalDay)}，还能自由花 ${currency(disposable)}`
            : `紧张：每天实际只能攒 ${currency(r.surplusDay)}，距目标每天还差 ${currency(Math.abs(disposable))}`}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed && styles.btnPressed]}
          onPress={onReset}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <Text style={styles.resetBtnText}>清空并重置所有数据</Text>
        </Pressable>
      </View>

      {/* 每天收支对比：一眼看出会不会花超 */}
      <Card title="每天收支对比" accent="cyan">
        <RatioBar
          label="每天收入（基准）"
          value={r.grossDay}
          max={r.grossDay || 1}
          color={colors.primary}
          valueText={currency(r.grossDay)}
        />
        <RatioBar
          label="每天花销合计"
          value={r.auditExpDay}
          max={r.grossDay || 1}
          color={colors.red}
          valueText={`${currency(r.auditExpDay)} · 占收入 ${pct(r.auditExpDay, r.grossDay)}%`}
        />
        <RatioBar
          label="每天要存的目标"
          value={r.goalDay}
          max={r.grossDay || 1}
          color={colors.amber}
          valueText={`${currency(r.goalDay)} · 占收入 ${pct(r.goalDay, r.grossDay)}%`}
        />
        <RatioBar
          label="每天能剩下"
          value={Math.max(0, r.surplusDay - r.goalDay)}
          max={r.grossDay || 1}
          color={colors.green}
          valueText={`${currency(r.surplusDay - r.goalDay)} (${pct(r.surplusDay - r.goalDay, r.grossDay)}%)`}
          note={
            r.auditExpDay + r.goalDay > r.grossDay
              ? '⚠️ 花销 + 攒钱目标已经超过每天收入，这天会倒亏，需要压缩开销或加收入。'
              : '✅ 花销和攒钱目标都在每天收入之内，不会花超。'
          }
        />
      </Card>

      {/* 钱袋子全周期储备投影 */}
      <Card title="攒钱进度投影" accent="green">
        <Text style={styles.hint}>短周期固定算账</Text>
        <View style={[styles.tileRow, isSmall && styles.tileRowCol]}>
          <Tile label="每天攒下" value={currency(r.tlDay)} color={colors.primary} topColor={colors.primary} />
          <Tile label="每周攒下" value={currency(r.tlWeek)} color={colors.green} topColor={colors.green} />
          <Tile label="每月攒下" value={currency(r.tlMonth)} color={colors.amber} topColor={colors.amber} />
        </View>

        <View style={[styles.yearInputRow, isSmall && styles.yearInputRowCol]}>
          <TextInput
            style={[styles.input, { flex: isSmall ? 1 : 2 }]}
            placeholder="想看哪一年？如 2026 / 2027"
            placeholderTextColor={colors.sub}
            value={yearLabel}
            onChangeText={setYearLabel}
          />
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.green }, pressed && styles.btnPressed]}
            onPress={onAddYear}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={styles.addBtnText}>添加年份</Text>
          </Pressable>
        </View>

        <View style={styles.yearGrid}>
          {r.yearProjections.length === 0 ? (
            <Text style={styles.empty}>暂无年份，请在上方添加</Text>
          ) : (
            r.yearProjections.map((y) => (
              <View key={y.id} style={[styles.yearBlock, isSmall && styles.yearBlockFull]}>
                <Pressable
                  style={({ pressed }) => [styles.yearDel, pressed && styles.btnPressed]}
                  onPress={() => delYear(y.id)}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  <Text style={styles.yearDelText}>✕</Text>
                </Pressable>
                <Text style={styles.yearLabel}>{y.label} 年底累计</Text>
                <Text style={[styles.yearValue, { color: colors.green }]}>{currency(y.cumulative)}</Text>
                <Text style={styles.yearSub}>持续攒钱第 {y.index} 年</Text>
              </View>
            ))
          )}
        </View>

        {r.analysis ? (
          <ResultBox accent="green">
            {r.analysis.meetsGoal ? (
              <Text style={{ color: colors.greenDark, fontSize: 15, lineHeight: 22 }}>
                到 <Text style={{ fontWeight: '800' }}>{r.analysis.lastLabel}年</Text> 底（攒了 {r.analysis.lastIndex} 年），
                预计攒下 <Text style={{ fontWeight: '800' }}>{currency(r.analysis.finalAccumulation)}</Text>，
                已经超过目标 {currency(r.totalGoal)}，多出 {currency(r.analysis.overflow)}。
              </Text>
            ) : (
              <Text style={{ color: colors.redDark, fontSize: 15, lineHeight: 22 }}>
                到 <Text style={{ fontWeight: '800' }}>{r.analysis.lastLabel}年</Text> 底（攒了 {r.analysis.lastIndex} 年），
                累计约 <Text style={{ fontWeight: '800' }}>{currency(r.analysis.finalAccumulation)}</Text>，
                距目标还差 <Text style={{ fontWeight: '800' }}>{currency(r.analysis.gap)}</Text>。可以多加点年份或提高收入。
              </Text>
            )}
          </ResultBox>
        ) : null}
      </Card>

      {/* 真实收支与攒钱盈余核算 */}
      <Card title="真实收支核算" accent="primary">
        <Text style={styles.hint}>
          收入按税前全额算。实际交的个税 / 五险一金请在「生活」页记成开销，这样算出来才是你真正能攒下的钱。
        </Text>
        <View style={[styles.auditRow, isSmall && styles.auditRowCol]}>
          <ResultBox accent="primary">
            <Text style={styles.auditH}>每天</Text>
            <Stat label="收入(税前):" value={currency(r.auditNetDay)} color={colors.green} bold />
            <Stat label="花销(总计):" value={currency(r.auditExpDay)} color={colors.red} bold />
            <Text style={styles.subNote}>
              生活费 {currency(r.totalExpDay)} + 大件分期 {currency(r.totalBigDayCost)} + 工具成本 {currency(r.totalWorkDayCost)}
            </Text>
            <Stat label="实际攒下:" value={currency(r.surplusDay)} color={r.surplusDay >= r.goalDay ? colors.green : colors.red} bold />
            <Stat label="攒钱目标:" value={currency(r.goalDay)} color={colors.sub} />
          </ResultBox>

          <ResultBox accent="green">
            <Text style={styles.auditH}>每月</Text>
            <Stat label="收入(税前):" value={currency(r.auditNetMonth)} color={colors.green} bold />
            <Stat label="花销(总计):" value={currency(r.auditExpMonth)} color={colors.red} bold />
            <Text style={styles.subNote}>
              生活费 {currency(r.totalExpMonth)} + 大件分期 {currency(r.totalBigDayCost * DAYS_IN_MONTH)} + 工具成本 {currency(r.totalWorkDayCost * DAYS_IN_MONTH)}
            </Text>
            <Stat label="实际攒下:" value={currency(r.surplusMonth)} color={r.surplusMonth >= r.goalDay * DAYS_IN_MONTH ? colors.green : colors.red} bold />
            <Stat label="攒钱目标:" value={currency(r.goalDay * DAYS_IN_MONTH)} color={colors.sub} />
          </ResultBox>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  heroNum: { fontSize: 40, fontWeight: '900', marginVertical: 10 },
  heroFormula: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  status: { fontSize: 15, fontWeight: '700', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  resetBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnPressed: { opacity: 0.85 },

  hint: { fontSize: 13, color: colors.sub, marginBottom: 10 },
  tileRow: { flexDirection: 'row', gap: 10 },
  tileRowCol: { flexDirection: 'column' },

  yearInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  yearInputRowCol: { flexDirection: 'column', alignItems: 'stretch' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.text,
  },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  yearBlock: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.greenBg,
    borderRadius: 12,
    padding: 14,
    paddingTop: 28,
    alignItems: 'center',
    position: 'relative',
  },
  yearBlockFull: { minWidth: '100%', flex: 0 },
  yearDel: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.red,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  yearDelText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  yearLabel: { fontSize: 14, fontWeight: '700', color: colors.textStrong, marginBottom: 4 },
  yearValue: { fontSize: 20, fontWeight: '800' },
  yearSub: { fontSize: 12, color: colors.sub, marginTop: 2 },
  empty: { color: colors.sub, padding: 16, textAlign: 'center', width: '100%' },

  auditRow: { gap: 12 },
  auditRowCol: { flexDirection: 'column' },
  auditH: { fontSize: 15, fontWeight: '800', color: colors.primaryDark, marginBottom: 8 },
  subNote: { fontSize: 12, color: colors.sub, marginVertical: 4, lineHeight: 18 },
});

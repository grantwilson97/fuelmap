import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { getBestChargingWindow } from '../services/watttime';

const INTENSITY_COLORS = {
  clean: '#16a34a',
  moderate: '#ca8a04',
  dirty: '#dc2626',
};

function TouBar({ percent, label }: { percent: number; label: string }) {
  const color = percent < 35 ? INTENSITY_COLORS.clean : percent < 65 ? INTENSITY_COLORS.moderate : INTENSITY_COLORS.dirty;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ width: '80%', height: Math.max(4, Math.round(percent / 100 * 48)), backgroundColor: color, borderRadius: 2, alignSelf: 'center' }} />
      <Text style={{ fontSize: 8, color: '#aaa' }}>{label}</Text>
    </View>
  );
}

function TipCard({ icon, title, body, impact }: { icon: string; title: string; body: string; impact: string }) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipTop}>
        <View style={styles.tipIcon}>
          <Text style={{ fontSize: 14 }}>{icon}</Text>
        </View>
        <Text style={styles.tipTitle}>{title}</Text>
      </View>
      <Text style={styles.tipBody}>{body}</Text>
      <Text style={styles.tipImpact}>{impact}</Text>
    </View>
  );
}

export function CarbonScreen() {
  const gridIntensity = useAppStore(s => s.gridIntensity);
  const gridForecast = useAppStore(s => s.gridForecast);

  const bestWindow = useMemo(() => getBestChargingWindow(gridForecast), [gridForecast]);

  // Build 24h display from forecast (show every 3 hours)
  const forecastDisplay = useMemo(() => {
    if (gridForecast.length === 0) {
      // Fallback demo data shaped like PG&E's typical daily pattern
      return [
        { label: '12a', percent: 28 }, { label: '3a', percent: 22 },
        { label: '6a', percent: 30 }, { label: '9a', percent: 38 },
        { label: '12p', percent: 32 }, { label: '3p', percent: 45 },
        { label: '6p', percent: 82 }, { label: '9p', percent: 75 },
      ];
    }
    const step = Math.max(1, Math.floor(gridForecast.length / 8));
    return gridForecast.filter((_, i) => i % step === 0).slice(0, 8).map(f => ({
      label: new Date(f.pointTime).toLocaleTimeString([], { hour: 'numeric' }),
      percent: f.percent,
    }));
  }, [gridForecast]);

  const currentLabel = gridIntensity?.label ?? 'moderate';
  const currentPercent = gridIntensity?.percent ?? 45;
  const currentValue = gridIntensity?.value ?? 141;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Carbon tracker</Text>
        <Text style={styles.heroSub}>PG&E grid · SF Bay Area</Text>
        <View style={styles.heroRow}>
          {/* Ring */}
          <View style={styles.ringWrap}>
            <View style={[styles.ringOuter, { borderColor: INTENSITY_COLORS[currentLabel] }]}>
              <View style={[styles.ringInner, { backgroundColor: `${INTENSITY_COLORS[currentLabel]}22` }]}>
                <Text style={[styles.ringVal, { color: '#fff' }]}>{currentValue}</Text>
                <Text style={styles.ringUnit}>gCO₂/kWh</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatRow}>
              <Text style={styles.heroStatLbl}>Grid status</Text>
              <Text style={[styles.heroStatVal, { color: INTENSITY_COLORS[currentLabel] }]}>
                {currentLabel.charAt(0).toUpperCase() + currentLabel.slice(1)}
              </Text>
            </View>
            <View style={styles.heroStatRow}>
              <Text style={styles.heroStatLbl}>vs. last month</Text>
              <Text style={styles.heroStatVal}>↓ 18%</Text>
            </View>
            <View style={styles.heroStatRow}>
              <Text style={styles.heroStatLbl}>vs. SF avg driver</Text>
              <Text style={styles.heroStatVal}>↓ 44%</Text>
            </View>
            <View style={styles.heroStatRow}>
              <Text style={styles.heroStatLbl}>Your monthly CO₂</Text>
              <Text style={styles.heroStatVal}>142 kg</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PG&E TOU chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PG&E grid carbon intensity today</Text>
          <View style={styles.touChart}>
            {forecastDisplay.map((d, i) => (
              <TouBar key={i} percent={d.percent} label={d.label} />
            ))}
          </View>
          <View style={styles.touLegend}>
            {(['clean', 'moderate', 'dirty'] as const).map(k => (
              <View key={k} style={styles.touLegItem}>
                <View style={[styles.touLegDot, { backgroundColor: INTENSITY_COLORS[k] }]} />
                <Text style={styles.touLegText}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
              </View>
            ))}
          </View>
          {bestWindow && (
            <View style={styles.bestWindowBox}>
              <Text style={styles.bestWindowTitle}>Best charging window</Text>
              <Text style={styles.bestWindowBody}>
                {new Date(bestWindow.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(bestWindow.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {'  ·  '}saves ~{bestWindow.savingVsPeak}% CO₂ vs. peak
              </Text>
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SF-specific tips</Text>
          <TipCard
            icon="⚡"
            title="Charge before 3 PM — solar peaks at noon"
            body="PG&E solar generation peaks midday, dropping grid carbon below 100 gCO₂/kWh. Open Supercharger stalls right now: SoMa Hub, Mission Bay, Stonestown."
            impact="Est. impact: −22 kg CO₂/mo"
          />
          <TipCard
            icon="🚫"
            title="Skip 4th & Bryant Shell — priciest in SF"
            body="At $6.09/gal it's 7¢ above average. The Arco on Cesar Chavez is $5.84 — $1.25 cheaper per fillup on a 16-gal tank."
            impact="Est. savings: $1.25/fillup"
          />
          <TipCard
            icon="✈️"
            title="Free Level 2 charging at SFO Terminal 3"
            body="Included with parking. Arrive 30 min early on airport trips and charge while you wait — no extra cost, no separate stop."
            impact="Est. impact: −8 kg CO₂/mo"
          />
          <TipCard
            icon="🌙"
            title="Charge overnight 11 PM – 6 AM"
            body="PG&E off-peak rate ($0.26/kWh) vs. peak ($0.57/kWh) is a 54% saving per session. Set a reminder and plug in before bed."
            impact="Est. savings: $12–18/mo"
          />
        </View>

        <TouchableOpacity style={styles.planCta}>
          <Text style={styles.planCtaText}>Get my personalized SF carbon plan ↗</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  hero: { backgroundColor: '#065f46', padding: 18 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  ringVal: { fontSize: 18, fontWeight: '800' },
  ringUnit: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textAlign: 'center' },
  heroStats: { flex: 1 },
  heroStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  heroStatLbl: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  heroStatVal: { fontSize: 12, fontWeight: '700', color: '#fff' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  touChart: { flexDirection: 'row', alignItems: 'flex-end', height: 60, marginBottom: 8 },
  touLegend: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  touLegItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  touLegDot: { width: 10, height: 10, borderRadius: 2 },
  touLegText: { fontSize: 11, color: '#888' },
  bestWindowBox: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  bestWindowTitle: { fontSize: 12, fontWeight: '700', color: '#15803d', marginBottom: 3 },
  bestWindowBody: { fontSize: 12, color: '#16a34a' },
  tipCard: { backgroundColor: '#fff', borderRadius: 14, padding: 13, marginBottom: 8, borderWidth: 1.5, borderColor: '#e0e0e0' },
  tipTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 },
  tipIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  tipBody: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 7 },
  tipImpact: { fontSize: 10, fontWeight: '700', color: '#15803d', backgroundColor: '#dcfce7', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  planCta: { margin: 14, backgroundColor: '#047857', borderRadius: 14, padding: 14, alignItems: 'center' },
  planCtaText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

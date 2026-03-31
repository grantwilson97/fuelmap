import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Station } from '../services/stations';

interface Props {
  station: Station;
  isSelected: boolean;
  onPress: () => void;
  onNavigate: () => void;
}

function scoreColor(score: number) {
  if (score >= 80) return { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' };
  if (score >= 65) return { bg: '#fffbeb', border: '#d97706', text: '#d97706' };
  return { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' };
}

function crowdColor(busyness: number) {
  if (busyness < 35) return '#16a34a';
  if (busyness < 65) return '#d97706';
  return '#dc2626';
}

function crowdLabel(busyness: number) {
  if (busyness < 35) return 'Light';
  if (busyness < 65) return 'Moderate';
  return 'Busy';
}

export function StationCard({ station, isSelected, onPress, onNavigate }: Props) {
  const sc = scoreColor(station.valueScore);
  const waitMin = Math.max(0, Math.round((station.busynessNow - 20) / 20));
  const priceStr = station.type === 'ev'
    ? `$${(station.evL2Price ?? 0).toFixed(2)}/kWh`
    : `$${(station.price ?? 0).toFixed(2)}/gal`;

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{station.name}</Text>
          <Text style={styles.dist}>{station.distanceMi.toFixed(1)} mi · {station.address.split(',')[1]?.trim()}</Text>
        </View>
        <View style={[styles.scoreRing, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.scoreText, { color: sc.text }]}>{station.valueScore}</Text>
        </View>
      </View>

      {/* Price */}
      <Text style={styles.priceBig}>{priceStr}</Text>
      {station.loyaltyApplied && (
        <Text style={styles.loyaltyNote}>After loyalty discount</Text>
      )}

      {/* Mini stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>WAIT</Text>
          <Text style={[styles.statVal, { color: crowdColor(station.busynessNow) }]}>
            {waitMin}m
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>CROWD</Text>
          <Text style={[styles.statVal, { color: crowdColor(station.busynessNow) }]}>
            {crowdLabel(station.busynessNow)}
          </Text>
          <View style={styles.crowdBar}>
            <View
              style={[
                styles.crowdFill,
                {
                  width: `${station.busynessNow}%` as any,
                  backgroundColor: crowdColor(station.busynessNow),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Navigate button */}
      <TouchableOpacity style={styles.navBtn} onPress={onNavigate}>
        <Text style={styles.navBtnText}>See details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 185,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#eee',
    padding: 12,
    flexShrink: 0,
  },
  selectedCard: {
    borderColor: '#1667d9',
    shadowColor: '#1667d9',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nameBlock: { flex: 1, paddingRight: 6 },
  name: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  dist: { fontSize: 10, color: '#888', marginTop: 1 },
  scoreRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreText: { fontSize: 13, fontWeight: '800' },
  priceBig: { fontSize: 20, fontWeight: '800', color: '#1667d9', marginBottom: 2 },
  loyaltyNote: { fontSize: 10, color: '#16a34a', fontWeight: '600', marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: '#f7f7f9', borderRadius: 8, padding: 6 },
  statLabel: { fontSize: 9, color: '#888', fontWeight: '700', letterSpacing: 0.3 },
  statVal: { fontSize: 12, fontWeight: '700', color: '#1a1a2e', marginTop: 1 },
  crowdBar: { height: 3, backgroundColor: '#eee', borderRadius: 2, marginTop: 3 },
  crowdFill: { height: '100%', borderRadius: 2 },
  navBtn: {
    backgroundColor: '#1667d9',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

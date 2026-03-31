import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorTrack}>
        <View style={[styles.factorFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.factorVal, { color }]}>{score}</Text>
    </View>
  );
}

export function StationDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { stationId } = route.params;

  const station = useAppStore(s => s.stations.find(st => st.id === stationId));
  const gridIntensity = useAppStore(s => s.gridIntensity);

  if (!station) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20, color: '#888' }}>Station not found.</Text>
      </SafeAreaView>
    );
  }

  const waitMin = Math.max(0, Math.round((station.busynessNow - 20) / 20));
  const scoreColor = station.valueScore >= 80 ? '#16a34a' : station.valueScore >= 65 ? '#d97706' : '#dc2626';
  const scoreBg = station.valueScore >= 80 ? '#f0fdf4' : station.valueScore >= 65 ? '#fffbeb' : '#fef2f2';

  const handleNavigate = () => {
    const url = Platform.select({
      ios: `maps:?daddr=${station.latitude},${station.longitude}&q=${encodeURIComponent(station.name)}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: station.type === 'ev' ? '#064e35' : station.valueScore < 65 ? '#7f1d1d' : '#0d3d8a' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={14} color="#1667d9" />
          <Text style={styles.backText}>Map</Text>
        </TouchableOpacity>
        <View style={[styles.scoreFloat, { backgroundColor: scoreBg, borderColor: scoreColor }]}>
          <Text style={[styles.scoreFloatVal, { color: scoreColor }]}>{station.valueScore}</Text>
          <Text style={styles.scoreFloatLbl}>Score</Text>
        </View>
        <Text style={styles.heroName}>{station.name}</Text>
        <Text style={styles.heroAddr}>{station.address}</Text>
        <View style={styles.tagRow}>
          {station.isOpen && <View style={styles.tag}><Text style={styles.tagText}>{station.open24h ? 'Open 24h' : 'Open now'}</Text></View>}
          <View style={[styles.tag, { backgroundColor: '#dbeafe' }]}><Text style={[styles.tagText, { color: '#1d4ed8' }]}>{station.distanceMi.toFixed(1)} mi away</Text></View>
          {station.loyaltyApplied && <View style={[styles.tag, { backgroundColor: '#dcfce7' }]}><Text style={[styles.tagText, { color: '#15803d' }]}>Loyalty applied</Text></View>}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Prices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prices</Text>
          <View style={styles.priceGrid}>
            {station.type !== 'ev' && (
              <>
                <View style={[styles.priceTile, styles.priceTileBest]}>
                  <Text style={styles.priceTileLabel}>Regular</Text>
                  <Text style={[styles.priceTileVal, { color: '#1667d9' }]}>${station.price?.toFixed(2)}</Text>
                  {station.loyaltyApplied && <Text style={styles.priceDelta}>After loyalty</Text>}
                </View>
                <View style={styles.priceTile}>
                  <Text style={styles.priceTileLabel}>Midgrade</Text>
                  <Text style={styles.priceTileVal}>${((station.price ?? 0) + 0.30).toFixed(2)}</Text>
                </View>
                <View style={styles.priceTile}>
                  <Text style={styles.priceTileLabel}>Premium</Text>
                  <Text style={styles.priceTileVal}>${((station.price ?? 0) + 0.60).toFixed(2)}</Text>
                </View>
              </>
            )}
            {station.type !== 'gas' && (
              <>
                <View style={[styles.priceTile, styles.priceTileBest]}>
                  <Text style={styles.priceTileLabel}>EV Level 2</Text>
                  <Text style={[styles.priceTileVal, { color: '#1667d9' }]}>${station.evL2Price?.toFixed(2)}/kWh</Text>
                </View>
                {station.evDCPrice && (
                  <View style={styles.priceTile}>
                    <Text style={styles.priceTileLabel}>EV DC Fast</Text>
                    <Text style={styles.priceTileVal}>${station.evDCPrice.toFixed(2)}/kWh</Text>
                  </View>
                )}
                {station.totalL2Connectors && (
                  <View style={styles.priceTile}>
                    <Text style={styles.priceTileLabel}>L2 stalls</Text>
                    <Text style={styles.priceTileVal}>{station.totalL2Connectors}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Value score breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Value score breakdown</Text>
          <ScoreBar label="Price" score={station.subScores.price} color="#1667d9" />
          <ScoreBar label="Wait time" score={station.subScores.wait} color="#16a34a" />
          <ScoreBar label="Distance" score={station.subScores.distance} color="#d97706" />
          <ScoreBar label="Amenities" score={station.subScores.amenity} color="#7c3aed" />
        </View>

        {/* Crowd */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crowd right now</Text>
          <View style={styles.crowdStatusBox}>
            <Text style={styles.crowdStatusText}>
              {waitMin === 0 ? 'No wait — pull straight in' : `~${waitMin} min wait`}
              {'  ·  '}
              {station.busynessNow < 35 ? 'Very light' : station.busynessNow < 65 ? 'Moderate' : 'Busy'}
            </Text>
          </View>
        </View>

        {/* PG&E tip */}
        {station.type !== 'gas' && gridIntensity && (
          <View style={styles.pgeBox}>
            <Text style={styles.pgeTitle}>⚡ PG&E grid right now</Text>
            <Text style={styles.pgeBody}>
              Current grid intensity: {gridIntensity.value} gCO₂/kWh ({gridIntensity.label}).{'\n'}
              Off-peak charging (9 PM–3 PM) can save 30–50% CO₂ and cut your kWh cost significantly.
            </Text>
          </View>
        )}

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenityRow}>
            {Object.entries(station.amenities).map(([key, val]) => (
              <View key={key} style={[styles.amenPill, val ? styles.amenPillYes : styles.amenPillNo]}>
                <Text style={[styles.amenPillText, val ? styles.amenPillTextYes : styles.amenPillTextNo]}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hours */}
        {station.openingHours && station.openingHours.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hours</Text>
            {station.openingHours.map((h, i) => (
              <Text key={i} style={styles.hoursLine}>{h}</Text>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  hero: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 18, position: 'relative' },
  backBtn: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  backText: { fontSize: 13, fontWeight: '700', color: '#1667d9' },
  scoreFloat: { position: 'absolute', top: 12, right: 14, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2, alignItems: 'center' },
  scoreFloatVal: { fontSize: 22, fontWeight: '800' },
  scoreFloatLbl: { fontSize: 9, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginTop: -2 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
  heroAddr: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  priceTile: { flex: 1, minWidth: 90, backgroundColor: '#f7f7f9', borderRadius: 10, padding: 9 },
  priceTileBest: { backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe' },
  priceTileLabel: { fontSize: 9, color: '#888', fontWeight: '600', marginBottom: 2 },
  priceTileVal: { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
  priceDelta: { fontSize: 9, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  factorLabel: { fontSize: 12, color: '#555', width: 70 },
  factorTrack: { flex: 1, height: 6, backgroundColor: '#eee', borderRadius: 3 },
  factorFill: { height: '100%', borderRadius: 3 },
  factorVal: { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'right' },
  crowdStatusBox: { backgroundColor: '#f7f7f9', borderRadius: 8, padding: 10 },
  crowdStatusText: { fontSize: 13, color: '#555' },
  pgeBox: { backgroundColor: '#fff', marginTop: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  pgeTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 5 },
  pgeBody: { fontSize: 12, color: '#b45309', lineHeight: 18 },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  amenPillYes: { backgroundColor: '#dcfce7' },
  amenPillNo: { backgroundColor: '#f3f4f6' },
  amenPillText: { fontSize: 11, fontWeight: '600' },
  amenPillTextYes: { color: '#15803d' },
  amenPillTextNo: { color: '#9ca3af' },
  hoursLine: { fontSize: 12, color: '#555', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  actions: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e5e5e5' },
  shareBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#f2f2f7', alignItems: 'center' },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  navBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#1667d9' },
  navBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

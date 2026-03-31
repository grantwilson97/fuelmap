import React, { useRef, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MAPBOX_PUBLIC_TOKEN, SF_CENTER } from '../utils/constants';
import { useAppStore, useSortedStations } from '../store/useAppStore';
import { useLocation } from '../hooks/useLocation';
import { useStations } from '../hooks/useStations';
import { StationPin } from '../components/StationPin';
import { StationCard } from '../components/StationCard';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'gas', label: 'Gas' },
  { key: 'ev', label: 'EV charging' },
  { key: 'both', label: 'Gas + EV' },
  { key: 'open', label: 'Open now' },
] as const;

const SORTS = [
  { key: 'value', label: 'Value' },
  { key: 'price', label: 'Price' },
  { key: 'wait', label: 'Wait' },
] as const;

export function MapScreen() {
  const navigation = useNavigation<any>();
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const userLocation = useAppStore(s => s.userLocation);
  const selectedId = useAppStore(s => s.selectedStationId);
  const setSelected = useAppStore(s => s.setSelectedStation);
  const activeFilter = useAppStore(s => s.activeFilter);
  const setFilter = useAppStore(s => s.setFilter);
  const sortBy = useAppStore(s => s.sortBy);
  const setSortBy = useAppStore(s => s.setSortBy);
  const isLoading = useAppStore(s => s.isLoadingStations);

  useLocation();
  useStations();

  const stations = useSortedStations();

  const handleRecenter = useCallback(() => {
    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 14,
        animationDuration: 600,
      });
    }
  }, [userLocation]);

  const handleNavigate = useCallback((station: typeof stations[0]) => {
    const url = Platform.select({
      ios: `maps:?daddr=${station.latitude},${station.longitude}&q=${encodeURIComponent(station.name)}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  }, []);

  const center = userLocation ?? SF_CENTER;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>fuel<Text style={styles.wordmarkAccent}>map</Text></Text>
          <View style={styles.vehicleChip}>
            <Ionicons name="car-outline" size={12} color="#1d4ed8" />
            <Text style={styles.vehicleChipText}>
              {useAppStore(s => s.vehicle?.type ?? 'Set vehicle')}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchPill}>
            <Ionicons name="search" size={14} color="#aaa" />
            <TextInput
              style={styles.searchInput}
              placeholder="SoMa, Mission, Nob Hill…"
              placeholderTextColor="#aaa"
            />
          </View>
          <TouchableOpacity
            style={styles.filterIconBtn}
            onPress={() => navigation.navigate('Preferences')}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.fc, activeFilter === f.key && styles.fcActive]}
              onPress={() => setFilter(f.key as any)}
            >
              <Text style={[styles.fcText, activeFilter === f.key && styles.fcTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={14}
            centerCoordinate={[center.longitude, center.latitude]}
          />

          {/* User location */}
          <MapboxGL.UserLocation visible animated />

          {/* Station pins */}
          {stations.map(s => (
            <StationPin
              key={s.id}
              station={s}
              isSelected={s.id === selectedId}
              onPress={() => setSelected(s.id)}
            />
          ))}
        </MapboxGL.MapView>

        {/* Map overlays */}
        <View style={styles.overlayTR}>
          <View style={styles.pgeChip}>
            <Text style={styles.pgeChipText}>⚡ PG&E peak 4–9 PM</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
          <Ionicons name="locate" size={18} color="#1a1a2e" />
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#1667d9" />
            <Text style={styles.loadingText}>Finding stations…</Text>
          </View>
        )}
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.sheetDrag} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetHeadline}>{stations.length} stations nearby</Text>
            <Text style={styles.sheetSub}>SF Bay Area · sorted by {sortBy}</Text>
          </View>
          <View style={styles.sortPills}>
            {SORTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sp, sortBy === s.key && styles.spActive]}
                onPress={() => setSortBy(s.key as any)}
              >
                <Text style={[styles.spText, sortBy === s.key && styles.spTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {stations.map(s => (
            <StationCard
              key={s.id}
              station={s}
              isSelected={s.id === selectedId}
              onPress={() => {
                setSelected(s.id);
                cameraRef.current?.setCamera({
                  centerCoordinate: [s.longitude, s.latitude],
                  zoomLevel: 15,
                  animationDuration: 400,
                });
              }}
              onNavigate={() => navigation.navigate('StationDetail', { stationId: s.id })}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { backgroundColor: '#fff', paddingHorizontal: 14, paddingBottom: 8 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  wordmark: { fontSize: 22, fontWeight: '800', color: '#1667d9', letterSpacing: -0.5 },
  wordmarkAccent: { color: '#f5a623' },
  vehicleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: '#bfdbfe' },
  vehicleChipText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f2f2f7', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#1a1a2e' },
  filterIconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1667d9', alignItems: 'center', justifyContent: 'center' },
  filterScroll: { marginBottom: 4 },
  fc: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', marginRight: 6 },
  fcActive: { backgroundColor: '#1667d9', borderColor: '#1667d9' },
  fcText: { fontSize: 12, fontWeight: '600', color: '#555' },
  fcTextActive: { color: '#fff' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  overlayTR: { position: 'absolute', top: 10, right: 10 },
  pgeChip: { backgroundColor: '#fff7e6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#f5a623' },
  pgeChipText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  recenterBtn: { position: 'absolute', bottom: 10, right: 10, width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)' },
  loadingOverlay: { position: 'absolute', bottom: 50, left: '50%', transform: [{ translateX: -70 }], backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: '#555' },
  sheet: { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e5e5e5' },
  sheetDrag: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 8 },
  sheetHeadline: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  sheetSub: { fontSize: 11, color: '#888', marginTop: 1 },
  sortPills: { flexDirection: 'row', gap: 5 },
  sp: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  spActive: { backgroundColor: '#1667d9', borderColor: '#1667d9' },
  spText: { fontSize: 11, fontWeight: '600', color: '#888' },
  spTextActive: { color: '#fff' },
  cardsScroll: { paddingLeft: 14, paddingBottom: 12 },
});

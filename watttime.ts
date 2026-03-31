import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../store/useAppStore';
import { UserPrefsStore } from '../services/storage';

const VEHICLE_TYPES = [
  { key: 'sedan', label: 'Sedan / coupe', icon: '🚗' },
  { key: 'suv', label: 'SUV / crossover', icon: '🚙' },
  { key: 'truck', label: 'Truck / van', icon: '🛻' },
  { key: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
] as const;

const FUEL_TYPES = [
  { key: 'gas', label: 'Regular gas' },
  { key: 'ev', label: 'Electric (EV)' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'diesel', label: 'Diesel' },
] as const;

export function PreferencesScreen() {
  const navigation = useNavigation();
  const storeWeights = useAppStore(s => s.weights);
  const storeVehicle = useAppStore(s => s.vehicle);
  const setWeights = useAppStore(s => s.setWeights);
  const setVehicle = useAppStore(s => s.setVehicle);
  const maxDist = useAppStore(s => s.maxDistanceMi);
  const setMaxDist = useAppStore(s => s.setMaxDistanceMi);

  const [vehicleType, setVehicleType] = useState(storeVehicle?.type ?? 'sedan');
  const [fuelType, setFuelType] = useState(storeVehicle?.fuelTypes?.[0] ?? 'gas');
  const [wPrice, setWPrice] = useState(Math.round(storeWeights.price * 100));
  const [wWait, setWWait] = useState(Math.round(storeWeights.wait * 100));
  const [wDist, setWDist] = useState(Math.round(storeWeights.distance * 100));
  const [wAmen, setWAmen] = useState(Math.round(storeWeights.amenity * 100));
  const [dist, setDist] = useState(maxDist);
  const [nightMode, setNightMode] = useState(false);
  const [avoidBusy, setAvoidBusy] = useState(false);

  const total = wPrice + wWait + wDist + wAmen;
  const normalise = (v: number) => total > 0 ? v / total : 0.25;

  const handleSave = () => {
    const newWeights = {
      price: normalise(wPrice),
      wait: normalise(wWait),
      distance: normalise(wDist),
      amenity: normalise(wAmen),
    };
    const newVehicle = {
      type: vehicleType,
      fuelTypes: [fuelType],
      isPrimaryEV: fuelType === 'ev',
    };
    setWeights(newWeights);
    setVehicle(newVehicle);
    setMaxDist(dist);
    UserPrefsStore.setWeights(newWeights);
    UserPrefsStore.setVehicle(newVehicle);
    UserPrefsStore.setMaxDistance(dist);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#1667d9" />
        </TouchableOpacity>
        <Text style={styles.title}>My preferences</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Vehicle type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle type</Text>
          <View style={styles.optionGrid}>
            {VEHICLE_TYPES.map(v => (
              <TouchableOpacity
                key={v.key}
                style={[styles.optCard, vehicleType === v.key && styles.optCardActive]}
                onPress={() => setVehicleType(v.key)}
              >
                <Text style={styles.optIcon}>{v.icon}</Text>
                <Text style={[styles.optLabel, vehicleType === v.key && styles.optLabelActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fuel type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuel type</Text>
          <View style={styles.fuelChips}>
            {FUEL_TYPES.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.fuelChip, fuelType === f.key && styles.fuelChipActive]}
                onPress={() => setFuelType(f.key)}
              >
                <Text style={[styles.fuelChipText, fuelType === f.key && styles.fuelChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Value score weights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Value score priorities</Text>
          <Text style={styles.sectionHint}>
            Weights auto-normalise to 100% — set what matters most relative to everything else.
          </Text>
          {[
            { label: 'Price', val: wPrice, set: setWPrice, color: '#1667d9' },
            { label: 'Wait time', val: wWait, set: setWWait, color: '#16a34a' },
            { label: 'Distance', val: wDist, set: setWDist, color: '#d97706' },
            { label: 'Amenities', val: wAmen, set: setWAmen, color: '#7c3aed' },
          ].map(({ label, val, set, color }) => (
            <View key={label} style={styles.sliderRow}>
              <View style={styles.sliderLabelRow}>
                <Text style={styles.sliderLabel}>{label}</Text>
                <Text style={[styles.sliderVal, { color }]}>
                  {Math.round(normalise(val) * 100)}%
                </Text>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={val}
                onValueChange={set}
                minimumTrackTintColor={color}
                maximumTrackTintColor="#eee"
                thumbTintColor={color}
              />
            </View>
          ))}
        </View>

        {/* Search radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search radius</Text>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.sliderLabel}>Max distance</Text>
            <Text style={[styles.sliderVal, { color: '#1667d9' }]}>{dist.toFixed(1)} mi</Text>
          </View>
          <Slider
            minimumValue={0.5}
            maximumValue={10}
            step={0.5}
            value={dist}
            onValueChange={setDist}
            minimumTrackTintColor="#1667d9"
            maximumTrackTintColor="#eee"
            thumbTintColor="#1667d9"
          />
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart features</Text>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Nighttime safety mode</Text>
              <Text style={styles.toggleHint}>After 10 PM, prefer well-lit stations with ≥4 rating</Text>
            </View>
            <Switch value={nightMode} onValueChange={setNightMode} trackColor={{ true: '#1667d9' }} />
          </View>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Avoid busy stations</Text>
              <Text style={styles.toggleHint}>Filter out stations with estimated wait &gt; 10 min</Text>
            </View>
            <Switch value={avoidBusy} onValueChange={setAvoidBusy} trackColor={{ true: '#1667d9' }} />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  saveBtn: { backgroundColor: '#1667d9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  sectionHint: { fontSize: 12, color: '#aaa', marginBottom: 10, lineHeight: 17 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optCard: { width: '47%', borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  optCardActive: { borderColor: '#1667d9', backgroundColor: '#eff6ff' },
  optIcon: { fontSize: 24, marginBottom: 5 },
  optLabel: { fontSize: 12, color: '#555', fontWeight: '600', textAlign: 'center' },
  optLabelActive: { color: '#1667d9' },
  fuelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  fuelChipActive: { backgroundColor: '#1667d9', borderColor: '#1667d9' },
  fuelChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  fuelChipTextActive: { color: '#fff' },
  sliderRow: { marginBottom: 12 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel: { fontSize: 14, color: '#1a1a2e' },
  sliderVal: { fontSize: 14, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  toggleLabel: { fontSize: 14, color: '#1a1a2e', marginBottom: 2 },
  toggleHint: { fontSize: 11, color: '#aaa', maxWidth: 240 },
});

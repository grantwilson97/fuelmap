import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { AlertStore, Alert } from '../services/storage';
import { useAppStore as useStore } from '../store/useAppStore';
import { getBestChargingWindow } from '../services/watttime';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

function AlertCard({ alert, onRemove }: { alert: Alert; onRemove: () => void }) {
  const isTriggered = alert.status === 'triggered';
  return (
    <View style={[styles.alertCard, isTriggered && styles.alertCardTriggered]}>
      <View style={styles.acTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.acName}>{alert.fuelType.toUpperCase()} · {alert.scope === 'specific_station' ? alert.stationName : 'Any nearby station'}</Text>
          <Text style={styles.acLoc}>Within {alert.radiusMi} mi · SF Bay Area</Text>
        </View>
        <View style={[styles.acPill, isTriggered ? styles.acPillTriggered : styles.acPillActive]}>
          <Text style={[styles.acPillText, isTriggered ? styles.acPillTextTriggered : styles.acPillTextActive]}>
            {isTriggered ? 'Triggered!' : 'Active'}
          </Text>
        </View>
      </View>

      <View style={styles.acPriceRow}>
        <Text style={styles.acPriceBig}>Below ${alert.threshold.toFixed(2)}</Text>
        <Text style={styles.acPriceUnit}>{alert.fuelType.startsWith('ev') ? '/kWh' : '/gal'}</Text>
      </View>

      <Text style={styles.acDetail}>
        {isTriggered
          ? `Triggered ${new Date(alert.triggeredAt ?? '').toLocaleTimeString()}`
          : `Set ${new Date(alert.createdAt).toLocaleDateString()}`}
      </Text>

      <View style={styles.acBtns}>
        {isTriggered && (
          <TouchableOpacity style={[styles.acBtn, styles.acBtnPrimary]}>
            <Text style={styles.acBtnPrimaryText}>Navigate ↗</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.acBtn, styles.acBtnDanger]} onPress={onRemove}>
          <Text style={styles.acBtnDangerText}>{isTriggered ? 'Dismiss' : 'Remove'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function AlertsScreen() {
  const alerts = useAppStore(s => s.alerts);
  const setAlerts = useAppStore(s => s.setAlerts);
  const removeAlert = useAppStore(s => s.removeAlert);
  const gridForecast = useAppStore(s => s.gridForecast);
  const [showModal, setShowModal] = useState(false);

  // New alert form state
  const [newFuelType, setNewFuelType] = useState<'regular' | 'ev_l2' | 'ev_dc'>('regular');
  const [newThreshold, setNewThreshold] = useState('5.70');
  const [newRadius, setNewRadius] = useState('2');
  const [notifyPush, setNotifyPush] = useState(true);

  const bestWindow = getBestChargingWindow(gridForecast);

  const handleAddAlert = () => {
    const alert: Alert = {
      id: uuidv4(),
      fuelType: newFuelType,
      threshold: parseFloat(newThreshold),
      scope: 'any_nearby',
      radiusMi: parseFloat(newRadius),
      notifyPush,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    useStore.getState().addAlert(alert);
    AlertStore.addAlert(alert);
    setShowModal(false);
  };

  const handleRemove = (id: string) => {
    removeAlert(id);
    AlertStore.removeAlert(id);
  };

  const triggered = alerts.filter(a => a.status === 'triggered');
  const active = alerts.filter(a => a.status === 'active');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Price alerts</Text>
        <Text style={styles.heroSub}>San Francisco Bay Area</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{active.length}</Text>
            <Text style={styles.heroStatLbl}>Active</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{triggered.length}</Text>
            <Text style={styles.heroStatLbl}>Triggered</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{alerts.length}</Text>
            <Text style={styles.heroStatLbl}>Total</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PG&E smart window */}
        {bestWindow && (
          <View style={styles.pgeCard}>
            <Text style={styles.pgeTitle}>⚡ Best EV charging window tonight</Text>
            <Text style={styles.pgeBody}>
              PG&E grid is cleanest from{' '}
              {new Date(bestWindow.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' '}–{' '}
              {new Date(bestWindow.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              Charging then saves ~{bestWindow.savingVsPeak}% CO₂ vs. peak hours.
            </Text>
            <TouchableOpacity style={styles.pgeCta}>
              <Text style={styles.pgeCtaText}>Set charging reminder</Text>
            </TouchableOpacity>
          </View>
        )}

        {triggered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Triggered — act now</Text>
            {triggered.map(a => (
              <AlertCard key={a.id} alert={a} onRemove={() => handleRemove(a.id)} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active alerts</Text>
          {active.length === 0 ? (
            <Text style={styles.emptyText}>No active alerts. Tap + to create one.</Text>
          ) : (
            active.map(a => (
              <AlertCard key={a.id} alert={a} onRemove={() => handleRemove(a.id)} />
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* New alert modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New price alert</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#1a1a2e" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Fuel type</Text>
            <View style={styles.fuelChips}>
              {(['regular', 'ev_l2', 'ev_dc'] as const).map(ft => (
                <TouchableOpacity
                  key={ft}
                  style={[styles.fuelChip, newFuelType === ft && styles.fuelChipActive]}
                  onPress={() => setNewFuelType(ft)}
                >
                  <Text style={[styles.fuelChipText, newFuelType === ft && styles.fuelChipTextActive]}>
                    {ft === 'regular' ? 'Regular gas' : ft === 'ev_l2' ? 'EV Level 2' : 'EV DC Fast'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Alert when price drops below</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.pricePrefix}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={newThreshold}
                onChangeText={setNewThreshold}
                keyboardType="decimal-pad"
                placeholder="5.70"
              />
              <Text style={styles.priceUnit}>
                {newFuelType.startsWith('ev') ? 'per kWh' : 'per gallon'}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Search radius (miles)</Text>
            <View style={styles.fuelChips}>
              {['1', '2', '5'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.fuelChip, newRadius === r && styles.fuelChipActive]}
                  onPress={() => setNewRadius(r)}
                >
                  <Text style={[styles.fuelChipText, newRadius === r && styles.fuelChipTextActive]}>
                    {r} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Push notification</Text>
              <Switch value={notifyPush} onValueChange={setNotifyPush} trackColor={{ true: '#1667d9' }} />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddAlert}>
              <Text style={styles.saveBtnText}>Save alert</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  hero: { backgroundColor: '#1667d9', padding: 18 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
  heroStats: { flexDirection: 'row', gap: 10 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, alignItems: 'center' },
  heroStatVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  pgeCard: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: '#fbbf24' },
  pgeTitle: { fontSize: 13, fontWeight: '800', color: '#92400e', marginBottom: 5 },
  pgeBody: { fontSize: 12, color: '#b45309', lineHeight: 18, marginBottom: 8 },
  pgeCta: { backgroundColor: '#f59e0b', borderRadius: 10, padding: 9, alignItems: 'center' },
  pgeCtaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  section: { padding: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  emptyText: { color: '#aaa', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  alertCard: { backgroundColor: '#fff', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1.5, borderColor: '#eee' },
  alertCardTriggered: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  acTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  acName: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  acLoc: { fontSize: 11, color: '#888', marginTop: 1 },
  acPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  acPillActive: { backgroundColor: '#dcfce7' },
  acPillTriggered: { backgroundColor: '#fef3c7' },
  acPillText: { fontSize: 10, fontWeight: '700' },
  acPillTextActive: { color: '#15803d' },
  acPillTextTriggered: { color: '#b45309' },
  acPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 5 },
  acPriceBig: { fontSize: 22, fontWeight: '800', color: '#1667d9' },
  acPriceUnit: { fontSize: 12, color: '#888' },
  acDetail: { fontSize: 11, color: '#888', marginBottom: 9 },
  acBtns: { flexDirection: 'row', gap: 7 },
  acBtn: { flex: 1, padding: 8, borderRadius: 9, alignItems: 'center', borderWidth: 1.5 },
  acBtnPrimary: { backgroundColor: '#1667d9', borderColor: '#1667d9' },
  acBtnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  acBtnDanger: { borderColor: '#fecaca', backgroundColor: '#fff' },
  acBtnDangerText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: '#1667d9', alignItems: 'center', justifyContent: 'center', shadowColor: '#1667d9', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  modalBody: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8, marginTop: 16 },
  fuelChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fuelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  fuelChipActive: { backgroundColor: '#1667d9', borderColor: '#1667d9' },
  fuelChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  fuelChipTextActive: { color: '#fff' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: '#1667d9', paddingBottom: 6 },
  pricePrefix: { fontSize: 22, fontWeight: '500', color: '#888' },
  priceInput: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', flex: 1, padding: 0 },
  priceUnit: { fontSize: 13, color: '#888' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  switchLabel: { fontSize: 14, color: '#1a1a2e' },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 0.5, borderTopColor: '#eee' },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#f2f2f7', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  saveBtn: { flex: 2, padding: 13, borderRadius: 12, backgroundColor: '#1667d9', alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

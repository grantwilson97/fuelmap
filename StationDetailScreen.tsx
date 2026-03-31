import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MarkerView } from '@rnmapbox/maps';
import { Station } from '../services/stations';

interface Props {
  station: Station;
  isSelected: boolean;
  onPress: () => void;
}

function priceColor(station: Station): string {
  if (station.type === 'ev') return '#0d7a55';
  if (!station.price) return '#888';
  if (station.price < 5.85) return '#16a34a';
  if (station.price < 6.05) return '#1667d9';
  return '#dc2626';
}

function priceLabel(station: Station): string {
  if (station.type === 'ev' && station.evL2Price) {
    return `$${station.evL2Price.toFixed(2)}/kWh`;
  }
  if (station.price) return `$${station.price.toFixed(2)}`;
  return '—';
}

export function StationPin({ station, isSelected, onPress }: Props) {
  const color = priceColor(station);
  const label = priceLabel(station);

  return (
    <MarkerView
      coordinate={[station.longitude, station.latitude]}
      anchor={{ x: 0.5, y: 1 }}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.pinWrapper, isSelected && styles.selectedWrapper]}>
          <View style={[styles.bubble, { backgroundColor: color }]}>
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
            <Text style={styles.label}>{label}</Text>
          </View>
          <View style={[styles.tail, { borderTopColor: color }]} />
        </View>
      </TouchableOpacity>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: 'center',
  },
  selectedWrapper: {
    transform: [{ scale: 1.15 }],
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

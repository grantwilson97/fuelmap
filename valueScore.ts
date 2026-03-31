import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'fuelmap-storage' });

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function storeJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function loadJSON<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Specific storage namespaces ─────────────────────────────────────────────

export const UserPrefsStore = {
  getWeights: () => loadJSON<{ price: number; wait: number; distance: number; amenity: number }>('user_weights'),
  setWeights: (w: { price: number; wait: number; distance: number; amenity: number }) =>
    storeJSON('user_weights', w),

  getVehicle: () => loadJSON<{ type: string; fuelTypes: string[]; isPrimaryEV: boolean }>('user_vehicle'),
  setVehicle: (v: { type: string; fuelTypes: string[]; isPrimaryEV: boolean }) =>
    storeJSON('user_vehicle', v),

  getMaxDistance: () => storage.getNumber('max_distance_mi') ?? 3,
  setMaxDistance: (d: number) => storage.set('max_distance_mi', d),
};

export const AlertStore = {
  getAlerts: () => loadJSON<Alert[]>('price_alerts') ?? [],
  setAlerts: (alerts: Alert[]) => storeJSON('price_alerts', alerts),
  addAlert: (alert: Alert) => {
    const alerts = AlertStore.getAlerts();
    AlertStore.setAlerts([...alerts, alert]);
  },
  removeAlert: (id: string) => {
    AlertStore.setAlerts(AlertStore.getAlerts().filter(a => a.id !== id));
  },
};

export const LoyaltyStore = {
  getCards: () => loadJSON<LoyaltyCard[]>('loyalty_cards') ?? [],
  setCards: (cards: LoyaltyCard[]) => storeJSON('loyalty_cards', cards),
  addCard: (card: LoyaltyCard) => {
    const cards = LoyaltyStore.getCards();
    LoyaltyStore.setCards([...cards.filter(c => c.network !== card.network), card]);
  },
  removeCard: (id: string) => {
    LoyaltyStore.setCards(LoyaltyStore.getCards().filter(c => c.id !== id));
  },
  getDiscountForNetwork: (network: string): number => {
    const card = LoyaltyStore.getCards().find(c => c.network === network);
    return card?.discountPerGal ?? 0;
  },
};

export interface Alert {
  id: string;
  fuelType: string;
  threshold: number;
  scope: 'any_nearby' | 'specific_station';
  stationId?: string;
  stationName?: string;
  radiusMi: number;
  notifyPush: boolean;
  status: 'active' | 'triggered' | 'paused';
  createdAt: string;
  triggeredAt?: string;
}

export interface LoyaltyCard {
  id: string;
  network: string;
  networkLabel: string;
  cardNumberMask: string;
  discountPerGal: number;
  linkedAt: string;
}

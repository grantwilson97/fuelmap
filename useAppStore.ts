import { searchAFDCStations, parseAFDCStation } from './afdc';
import { searchGasStations, getPlaceDetails, parseGoogleStation, getCurrentBusyness } from './googlePlaces';
import { scoreStation } from '../utils/valueScore';
import { UserPrefsStore, LoyaltyStore } from './storage';
import {
  SF_MEDIAN_GAS_PRICE,
  SF_MEDIAN_EV_L2_PRICE,
  DEFAULT_WEIGHTS,
} from '../utils/constants';

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'gas' | 'ev' | 'both';
  fuelTypes: string[];
  price: number | null;
  evL2Price: number | null;
  evDCPrice: number | null;
  priceRecordedAt: Date;
  distanceMi: number;
  busynessNow: number;
  isOpen: boolean;
  open24h: boolean;
  rating?: number;
  network?: string;
  totalL2Connectors?: number;
  totalDCConnectors?: number;
  availableConnectors?: number;
  amenities: {
    carWash?: boolean;
    convenienceStore?: boolean;
    restrooms?: boolean;
    airWater?: boolean;
    evCharging?: boolean;
    atm?: boolean;
    open24h?: boolean;
    wellLit?: boolean;
    loyaltyProgram?: boolean;
  };
  openingHours?: string[];
  valueScore: number;
  subScores: { price: number; wait: number; distance: number; amenity: number };
  effectivePrice: number | null;
  loyaltyApplied: boolean;
}

// Haversine distance in miles
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// SF fallback prices when GasBuddy API isn't available
// These reflect current SF market prices — update when you add GasBuddy
const SF_FALLBACK_PRICES: Record<string, number> = {
  regular: 5.95,
  midgrade: 6.25,
  premium: 6.55,
  diesel: 7.29,
  ev_l2: 0.34,
  ev_dc: 0.47,
};

export async function fetchNearbyStations(
  userLat: number,
  userLng: number,
  radiusMiles = 2,
): Promise<Station[]> {
  const vehicle = UserPrefsStore.getVehicle();
  const weights = UserPrefsStore.getWeights() ?? DEFAULT_WEIGHTS;
  const maxDist = UserPrefsStore.getMaxDistance();
  const isEVUser = vehicle?.isPrimaryEV ?? false;
  const isTruck = vehicle?.type === 'truck';
  const hourOfDay = new Date().getHours();

  const [afdcRaw, googleRaw] = await Promise.all([
    searchAFDCStations({ latitude: userLat, longitude: userLng, radiusMiles }),
    searchGasStations(userLat, userLng, radiusMiles * 1609.34),
  ]);

  // Fetch details for top 5 Google stations (to get popular_times)
  const detailsPromises = googleRaw.slice(0, 5).map(p =>
    getPlaceDetails(p.place_id).catch(() => null),
  );
  const details = await Promise.all(detailsPromises);

  const evStations: Station[] = afdcRaw.map(raw => {
    const parsed = parseAFDCStation(raw);
    const dist = distanceMiles(userLat, userLng, parsed.latitude, parsed.longitude);
    const price = SF_FALLBACK_PRICES.ev_l2;
    const loyaltyDiscount = LoyaltyStore.getDiscountForNetwork(parsed.network ?? '');
    const areaMedian = SF_MEDIAN_EV_L2_PRICE;

    const { total, subScores, effectivePrice, loyaltyApplied } = scoreStation(
      {
        price,
        loyaltyDiscountPerGal: loyaltyDiscount,
        priceRecordedAt: new Date(),
        distanceMi: dist,
        busynessNow: 30,
        isEV: true,
        availableConnectors: undefined,
        totalConnectors: (parsed.totalL2Connectors ?? 0) + (parsed.totalDCConnectors ?? 0),
        amenities: parsed.amenities,
        fuelType: 'ev_l2',
      },
      areaMedian,
      maxDist,
      weights,
      isEVUser,
      isTruck,
      hourOfDay,
    );

    return {
      id: parsed.id,
      name: parsed.name,
      address: parsed.address,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      type: 'ev',
      fuelTypes: parsed.fuelTypes,
      price,
      evL2Price: price,
      evDCPrice: SF_FALLBACK_PRICES.ev_dc,
      priceRecordedAt: new Date(),
      distanceMi: dist,
      busynessNow: 30,
      isOpen: parsed.isOpen,
      open24h: parsed.open24h,
      network: parsed.network,
      totalL2Connectors: parsed.totalL2Connectors,
      totalDCConnectors: parsed.totalDCConnectors,
      amenities: parsed.amenities,
      valueScore: total,
      subScores,
      effectivePrice,
      loyaltyApplied,
    };
  });

  const gasStations: Station[] = googleRaw.map((place, i) => {
    const det = details[i] ?? undefined;
    const parsed = parseGoogleStation(place, det ?? undefined);
    const dist = distanceMiles(userLat, userLng, parsed.latitude, parsed.longitude);
    const busyness = det ? getCurrentBusyness(det.popular_times) : 30;
    const price = SF_FALLBACK_PRICES.regular;
    const loyaltyDiscount = LoyaltyStore.getDiscountForNetwork(place.name.toLowerCase());

    const { total, subScores, effectivePrice, loyaltyApplied } = scoreStation(
      {
        price,
        loyaltyDiscountPerGal: loyaltyDiscount,
        priceRecordedAt: new Date(),
        distanceMi: dist,
        busynessNow: busyness,
        isEV: false,
        amenities: parsed.amenities,
        fuelType: 'regular',
      },
      SF_MEDIAN_GAS_PRICE,
      maxDist,
      weights,
      isEVUser,
      isTruck,
      hourOfDay,
    );

    return {
      id: parsed.id,
      name: parsed.name,
      address: parsed.address,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      type: 'gas',
      fuelTypes: ['regular', 'midgrade', 'premium'],
      price,
      evL2Price: null,
      evDCPrice: null,
      priceRecordedAt: new Date(),
      distanceMi: dist,
      busynessNow: busyness,
      isOpen: parsed.isOpen,
      open24h: parsed.amenities.open24h ?? false,
      rating: parsed.rating,
      amenities: parsed.amenities,
      openingHours: parsed.openingHours,
      valueScore: total,
      subScores,
      effectivePrice,
      loyaltyApplied,
    };
  });

  // Merge, sort by value score, deduplicate by proximity
  const all = [...evStations, ...gasStations]
    .filter(s => s.distanceMi <= radiusMiles)
    .sort((a, b) => b.valueScore - a.valueScore);

  // Remove duplicates within 50m
  const deduped: Station[] = [];
  for (const s of all) {
    const isDup = deduped.some(
      d => distanceMiles(d.latitude, d.longitude, s.latitude, s.longitude) < 0.03,
    );
    if (!isDup) deduped.push(s);
  }

  return deduped.slice(0, 20);
}

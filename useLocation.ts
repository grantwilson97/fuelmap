import axios from 'axios';
import { GOOGLE_PLACES_BASE_URL, GOOGLE_PLACES_API_KEY } from '../utils/constants';

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  opening_hours?: { open_now: boolean };
  types: string[];
  price_level?: number;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  // Popular times — Google returns this for many stations
  popular_times?: Array<{
    name: string; // day name
    data: number[]; // 0–100 busyness for each hour
  }>;
  amenities?: {
    wheelchair_accessible_entrance?: boolean;
    restroom?: boolean;
  };
  types: string[];
}

// Search for gas stations near a coordinate
export async function searchGasStations(
  latitude: number,
  longitude: number,
  radiusMeters = 2000,
): Promise<GooglePlace[]> {
  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/nearbysearch/json`, {
      params: {
        key: GOOGLE_PLACES_API_KEY,
        location: `${latitude},${longitude}`,
        radius: radiusMeters,
        type: 'gas_station',
      },
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.warn('[GooglePlaces] Non-OK status:', response.data.status);
    }

    return response.data.results ?? [];
  } catch (error) {
    console.error('[GooglePlaces] Nearby search failed:', error);
    return [];
  }
}

// Get full details for a place (hours, popular_times, amenities)
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/details/json`, {
      params: {
        key: GOOGLE_PLACES_API_KEY,
        place_id: placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'formatted_phone_number',
          'geometry',
          'rating',
          'opening_hours',
          'popular_times',
          'types',
        ].join(','),
      },
    });

    return response.data.result ?? null;
  } catch (error) {
    console.error('[GooglePlaces] Place details failed:', error);
    return null;
  }
}

// Extract current busyness (0–100) from popular_times for the current hour
export function getCurrentBusyness(popularTimes?: PlaceDetails['popular_times']): number {
  if (!popularTimes) return 30; // default moderate

  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sunday
  const hour = now.getHours();

  const today = popularTimes[dayIndex];
  if (!today?.data) return 30;

  return today.data[hour] ?? 30;
}

// Parse a Google Place into our internal station format
export function parseGoogleStation(place: GooglePlace, details?: PlaceDetails) {
  const busyness = details ? getCurrentBusyness(details.popular_times) : 30;

  return {
    id: `gp_${place.place_id}`,
    googlePlaceId: place.place_id,
    name: place.name,
    address: details?.formatted_address ?? place.vicinity,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    type: 'gas' as const,
    fuelTypes: ['regular', 'midgrade', 'premium'],
    rating: place.rating,
    isOpen: place.opening_hours?.open_now ?? true,
    openingHours: details?.opening_hours?.weekday_text ?? [],
    busynessNow: busyness,
    amenities: {
      open24h: details?.opening_hours?.periods?.some(
        p => p.open.time === '0000' && !p.close,
      ) ?? false,
      restrooms: true, // assume true for gas stations; confirm via community reports
      airWater: true,
      loyaltyProgram: false,
    },
    // Price populated from GasBuddy / community reports
    price: null as number | null,
    priceRecordedAt: new Date(),
  };
}

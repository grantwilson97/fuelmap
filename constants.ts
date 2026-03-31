import axios from 'axios';
import { AFDC_BASE_URL, AFDC_API_KEY } from '../utils/constants';

export interface AFDCStation {
  id: number;
  station_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  fuel_type_code: string;
  ev_level1_evse_num: number | null;
  ev_level2_evse_num: number | null;
  ev_dc_fast_num: number | null;
  ev_connector_types: string[];
  ev_network: string | null;
  ev_pricing: string | null;
  access_code: string;
  access_days_time: string | null;
  cards_accepted: string | null;
  facility_type: string | null;
  open_24_hours: boolean;
  status_code: string;
}

export interface StationSearchParams {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  fuelType?: 'ELEC' | 'GAS' | 'LPG';
  limit?: number;
}

// Search AFDC for EV charging stations near a location
export async function searchAFDCStations(params: StationSearchParams): Promise<AFDCStation[]> {
  const { latitude, longitude, radiusMiles = 2, fuelType = 'ELEC', limit = 20 } = params;

  try {
    const response = await axios.get(`${AFDC_BASE_URL}.json`, {
      params: {
        api_key: AFDC_API_KEY,
        latitude,
        longitude,
        radius: radiusMiles,
        fuel_type: fuelType,
        limit,
        status: 'E', // E = open/available
        access: 'public',
      },
    });

    return response.data.fuel_stations ?? [];
  } catch (error) {
    console.error('[AFDC] Station search failed:', error);
    return [];
  }
}

// Get a single AFDC station by ID
export async function getAFDCStation(id: number): Promise<AFDCStation | null> {
  try {
    const response = await axios.get(`${AFDC_BASE_URL}/${id}.json`, {
      params: { api_key: AFDC_API_KEY },
    });
    return response.data.alt_fuel_station ?? null;
  } catch (error) {
    console.error('[AFDC] Station fetch failed:', error);
    return null;
  }
}

// Parse AFDC station into our internal format
export function parseAFDCStation(raw: AFDCStation) {
  const hasL2 = (raw.ev_level2_evse_num ?? 0) > 0;
  const hasDC = (raw.ev_dc_fast_num ?? 0) > 0;

  return {
    id: `afdc_${raw.id}`,
    name: raw.station_name,
    address: `${raw.street}, ${raw.city}, ${raw.state} ${raw.zip}`,
    latitude: raw.latitude,
    longitude: raw.longitude,
    type: 'ev' as const,
    network: raw.ev_network ?? 'Unknown',
    fuelTypes: [
      ...(hasL2 ? ['ev_l2'] : []),
      ...(hasDC ? ['ev_dc'] : []),
    ],
    connectors: raw.ev_connector_types ?? [],
    totalL2Connectors: raw.ev_level2_evse_num ?? 0,
    totalDCConnectors: raw.ev_dc_fast_num ?? 0,
    evPricing: raw.ev_pricing ?? null,
    accessDaysTime: raw.access_days_time ?? null,
    open24h: raw.open_24_hours ?? false,
    isOpen: raw.status_code === 'E',
    amenities: {
      evCharging: true,
      open24h: raw.open_24_hours,
    },
    // Price will be populated from network pricing or community reports
    price: null as number | null,
    priceRecordedAt: new Date(),
  };
}

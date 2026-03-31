import Constants from 'expo-constants';

// ─── API Keys ────────────────────────────────────────────────────────────────
// Replace these in app.json → extra, OR set them as environment variables.
// Never commit real keys to git — add .env to .gitignore.

export const MAPBOX_PUBLIC_TOKEN: string =
  Constants.expoConfig?.extra?.MAPBOX_PUBLIC_TOKEN ?? 'YOUR_MAPBOX_PUBLIC_TOKEN';

export const GOOGLE_PLACES_API_KEY: string =
  Constants.expoConfig?.extra?.GOOGLE_PLACES_API_KEY ?? 'YOUR_GOOGLE_PLACES_API_KEY';

export const AFDC_API_KEY: string =
  Constants.expoConfig?.extra?.AFDC_API_KEY ?? 'YOUR_AFDC_API_KEY';

export const WATTTIME_USER: string =
  Constants.expoConfig?.extra?.WATTTIME_USER ?? 'YOUR_WATTTIME_USERNAME';

export const WATTTIME_PASS: string =
  Constants.expoConfig?.extra?.WATTTIME_PASS ?? 'YOUR_WATTTIME_PASSWORD';

// ─── API Base URLs ────────────────────────────────────────────────────────────
export const AFDC_BASE_URL = 'https://developer.nrel.gov/api/alt-fuel-stations/v1';
export const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
export const WATTTIME_BASE_URL = 'https://api2.watttime.org/v3';

// ─── App Config ──────────────────────────────────────────────────────────────
export const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const SF_CENTER = { latitude: 37.7749, longitude: -122.4194 };

// Default value score weights
export const DEFAULT_WEIGHTS = {
  price: 0.40,
  wait: 0.35,
  distance: 0.15,
  amenity: 0.10,
};

// Price sensitivity constant for value score
export const PRICE_SENSITIVITY = 300;
export const WAIT_HALF_LIFE_MIN = 4;

// SF area median gas price (updated by community reports / API)
export const SF_MEDIAN_GAS_PRICE = 6.02;
export const SF_MEDIAN_EV_L2_PRICE = 0.35;
export const SF_MEDIAN_EV_DC_PRICE = 0.47;

// Fuel types
export const FUEL_TYPES = ['regular', 'midgrade', 'premium', 'diesel', 'ev_l2', 'ev_dc'] as const;
export type FuelType = typeof FUEL_TYPES[number];

export const FUEL_LABELS: Record<FuelType, string> = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
  diesel: 'Diesel',
  ev_l2: 'EV Level 2',
  ev_dc: 'EV DC Fast',
};

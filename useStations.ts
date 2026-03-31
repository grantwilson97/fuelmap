import axios from 'axios';
import { WATTTIME_BASE_URL, WATTTIME_USER, WATTTIME_PASS } from '../utils/constants';
import { storage } from './storage';

const TOKEN_KEY = 'watttime_token';
const TOKEN_EXPIRY_KEY = 'watttime_token_expiry';

// Authenticate and cache the token (valid 30 min)
async function getToken(): Promise<string | null> {
  try {
    const cached = storage.getString(TOKEN_KEY);
    const expiry = storage.getNumber(TOKEN_EXPIRY_KEY);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    const response = await axios.get(`${WATTTIME_BASE_URL}/login`, {
      auth: { username: WATTTIME_USER, password: WATTTIME_PASS },
    });

    const token: string = response.data.token;
    storage.set(TOKEN_KEY, token);
    storage.set(TOKEN_EXPIRY_KEY, Date.now() + 28 * 60 * 1000); // 28 min

    return token;
  } catch (error) {
    console.error('[WattTime] Auth failed:', error);
    return null;
  }
}

export interface GridIntensity {
  value: number;       // gCO2eq/kWh
  percent: number;     // 0–100, how clean vs. historical range
  region: string;      // e.g. "CAISO_PGAE"
  pointTime: string;   // ISO timestamp
  label: 'clean' | 'moderate' | 'dirty';
}

// Get current grid carbon intensity for a lat/lng
export async function getGridIntensity(
  latitude: number,
  longitude: number,
): Promise<GridIntensity | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    // First, determine the grid region (BA) for this location
    const regionResponse = await axios.get(`${WATTTIME_BASE_URL}/ba-from-loc`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { latitude, longitude },
    });

    const region: string = regionResponse.data.abbrev;

    // Then get the current index
    const indexResponse = await axios.get(`${WATTTIME_BASE_URL}/index`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { ba: region, style: 'percent' },
    });

    const { percent, freq, moer, point_time } = indexResponse.data;

    const label: GridIntensity['label'] =
      percent < 35 ? 'clean' : percent < 65 ? 'moderate' : 'dirty';

    return {
      value: Math.round(moer ?? 0),
      percent: Math.round(percent),
      region,
      pointTime: point_time,
      label,
    };
  } catch (error) {
    console.error('[WattTime] Grid intensity fetch failed:', error);
    return null;
  }
}

export interface ForecastPoint {
  pointTime: string;
  value: number;
  percent: number;
  label: 'clean' | 'moderate' | 'dirty';
}

// Get 24h forecast to find best charging windows
export async function getGridForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastPoint[]> {
  const token = await getToken();
  if (!token) return [];

  try {
    const regionResponse = await axios.get(`${WATTTIME_BASE_URL}/ba-from-loc`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { latitude, longitude },
    });

    const region: string = regionResponse.data.abbrev;

    const forecastResponse = await axios.get(`${WATTTIME_BASE_URL}/forecast`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { ba: region, style: 'percent' },
    });

    return (forecastResponse.data.forecast ?? []).map((f: any) => ({
      pointTime: f.point_time,
      value: Math.round(f.value ?? 0),
      percent: Math.round(f.percent ?? 0),
      label: f.percent < 35 ? 'clean' : f.percent < 65 ? 'moderate' : 'dirty',
    }));
  } catch (error) {
    console.error('[WattTime] Forecast fetch failed:', error);
    return [];
  }
}

// Find the best charging window in the next 12 hours
export function getBestChargingWindow(forecast: ForecastPoint[]): {
  startTime: string;
  endTime: string;
  avgPercent: number;
  savingVsPeak: number;
} | null {
  if (forecast.length < 4) return null;

  // Find 3-hour window with lowest average carbon
  let bestStart = 0;
  let bestAvg = Infinity;

  for (let i = 0; i <= forecast.length - 3; i++) {
    const window = forecast.slice(i, i + 3);
    const avg = window.reduce((s, p) => s + p.percent, 0) / window.length;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  const worstAvg = Math.max(...forecast.slice(0, 12).map(p => p.percent));
  const savingVsPeak = Math.round(worstAvg - bestAvg);

  return {
    startTime: forecast[bestStart].pointTime,
    endTime: forecast[Math.min(bestStart + 3, forecast.length - 1)].pointTime,
    avgPercent: Math.round(bestAvg),
    savingVsPeak,
  };
}

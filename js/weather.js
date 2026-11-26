/*
 * weather.js — DATA API: Open-Meteo (current weather)
 * https://open-meteo.com/en/docs
 *
 * The real weather in St. Louis right now: if it's raining there, it rains
 * on the bedroom window; clouds dim the light through the blinds; the
 * phone's lock-screen shows the temperature. No key; CORS: *.
 */

import { HOME } from "./config.js";
import { fetchJson } from "./net.js";

// WMO weather codes that mean rain, drizzle, showers or thunder.
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export async function getWeather() {
  const params = new URLSearchParams({
    latitude: HOME.lat,
    longitude: HOME.lng,
    current: "temperature_2m,precipitation,weather_code,cloud_cover",
    temperature_unit: "fahrenheit",
    timezone: "America/Chicago",
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const now = data?.current;
  if (!now) return null;
  return {
    temp: Math.round(now.temperature_2m),
    rain: RAIN_CODES.has(now.weather_code) || now.precipitation > 0.1,
    snow: SNOW_CODES.has(now.weather_code),
    cloudy: now.cloud_cover >= 70,
  };
}

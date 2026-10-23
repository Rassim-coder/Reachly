export interface Config {
  release: string;
  categories: string[];
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  outFile: string;
  cityLabel: string;
  categoryLabel: string;
}

/**
 * Target configuration, loaded from environment variables.
 * Every value has a default so `npm start` just works.
 *
 * To change city/category without editing code, e.g.:
 *   CATEGORY=used_car_dealer MIN_LON=2.0 npm start
 *
 * Current defaults target car dealers / "showrooms auto" in Algiers, Algeria.
 */
export function loadConfig(): Config {
  const num = (key: string, fallback: number): number => {
    const v = process.env[key];
    return v === undefined || v === '' ? fallback : Number(v);
  };
  return {
    release: process.env.RELEASE || '2026-08-19.0',
    categories: (process.env.CATEGORY || 'car_dealer')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    minLon: num('MIN_LON', 2.9),
    maxLon: num('MAX_LON', 3.25),
    minLat: num('MIN_LAT', 36.65),
    maxLat: num('MAX_LAT', 36.85),
    outFile: process.env.OUT_FILE || 'places_filtered.json',
    cityLabel: process.env.CITY_LABEL || 'Algiers, Algeria',
    categoryLabel: process.env.CATEGORY_LABEL || 'car dealers / showrooms',
  };
}
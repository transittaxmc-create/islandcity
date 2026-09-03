// ── NYC demand zones (TLC data) + odometer helpers ───────────────────
// Ported 1:1 from EI Program (replit-backup App.tsx).
export const IRS_RATE_PER_MILE = 0.70; // 2025 rate

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

type ZoneHeat = "hot" | "warm" | "cold";

const NYC_DEMAND_ZONES_DEF = [
  { id: "jfk",     name: "JFK Airport",               lat: 40.6413, lng: -73.7781 },
  { id: "lga",     name: "LaGuardia Airport",          lat: 40.7769, lng: -73.874 },
  { id: "ewr",     name: "Newark Airport (EWR)",       lat: 40.6895, lng: -74.1745 },
  { id: "penn",    name: "Penn Station / MSG",         lat: 40.7506, lng: -73.9935 },
  { id: "timesq",  name: "Times Square",               lat: 40.758,  lng: -73.9855 },
  { id: "gct",     name: "Grand Central",              lat: 40.7527, lng: -73.9772 },
  { id: "midtown", name: "Midtown Manhattan",          lat: 40.7549, lng: -73.984 },
  { id: "fidi",    name: "Financial District",         lat: 40.7074, lng: -74.0113 },
  { id: "ues",     name: "Upper East Side",            lat: 40.7739, lng: -73.9575 },
  { id: "wburg",   name: "Williamsburg",               lat: 40.7081, lng: -73.9571 },
  { id: "astoria", name: "Astoria / Queens",           lat: 40.7721, lng: -73.9302 },
  { id: "bklyn",   name: "Brooklyn Downtown",          lat: 40.6928, lng: -73.9903 },
  { id: "meatpk",  name: "Meatpacking / Chelsea",      lat: 40.7416, lng: -74.0057 },
  { id: "les",     name: "East Village / LES",         lat: 40.7264, lng: -73.9818 },
  { id: "harlem",  name: "Harlem",                     lat: 40.8116, lng: -73.9465 },
] as const;

type ZoneId = (typeof NYC_DEMAND_ZONES_DEF)[number]["id"];

// Demand table indexed by [dayType][hour 0-23] → [zoneId, heat][]
// "wkd" = Mon–Fri, "wke" = Sat–Sun
const NYC_HOURLY_DEMAND: Record<"wkd" | "wke", [ZoneId, ZoneHeat][][]> = {
  wkd: [
    /* 0 */ [["timesq","hot"],["les","hot"],["wburg","warm"],["meatpk","warm"],["jfk","cold"]],
    /* 1 */ [["timesq","hot"],["les","hot"],["wburg","warm"],["meatpk","warm"],["jfk","cold"]],
    /* 2 */ [["timesq","hot"],["les","warm"],["wburg","warm"],["meatpk","cold"]],
    /* 3 */ [["jfk","warm"],["lga","warm"],["timesq","cold"],["midtown","cold"]],
    /* 4 */ [["jfk","hot"],["lga","warm"],["ewr","warm"],["timesq","cold"]],
    /* 5 */ [["jfk","hot"],["lga","hot"],["ewr","warm"],["midtown","cold"]],
    /* 6 */ [["lga","hot"],["jfk","warm"],["midtown","warm"],["gct","warm"],["penn","cold"]],
    /* 7 */ [["midtown","hot"],["gct","hot"],["penn","warm"],["fidi","warm"],["lga","warm"]],
    /* 8 */ [["midtown","hot"],["gct","hot"],["penn","hot"],["fidi","warm"],["ues","warm"]],
    /* 9 */ [["midtown","hot"],["gct","warm"],["penn","warm"],["fidi","warm"],["ues","cold"]],
    /* 10 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["fidi","cold"],["jfk","cold"]],
    /* 11 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["bklyn","cold"]],
    /* 12 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["penn","cold"],["bklyn","cold"]],
    /* 13 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["penn","cold"]],
    /* 14 */ [["midtown","hot"],["timesq","warm"],["penn","warm"],["ues","cold"]],
    /* 15 */ [["penn","hot"],["midtown","hot"],["gct","warm"],["timesq","warm"]],
    /* 16 */ [["penn","hot"],["gct","hot"],["midtown","hot"],["timesq","warm"],["ues","cold"]],
    /* 17 */ [["penn","hot"],["gct","hot"],["midtown","hot"],["timesq","warm"],["fidi","warm"]],
    /* 18 */ [["penn","hot"],["timesq","hot"],["gct","warm"],["midtown","warm"],["jfk","cold"]],
    /* 19 */ [["timesq","hot"],["penn","warm"],["ues","warm"],["wburg","cold"],["jfk","cold"]],
    /* 20 */ [["timesq","hot"],["ues","warm"],["wburg","warm"],["meatpk","cold"]],
    /* 21 */ [["timesq","hot"],["wburg","warm"],["ues","warm"],["meatpk","warm"],["les","cold"]],
    /* 22 */ [["timesq","hot"],["wburg","warm"],["meatpk","warm"],["les","warm"],["ues","cold"]],
    /* 23 */ [["timesq","hot"],["les","warm"],["wburg","warm"],["meatpk","warm"],["jfk","cold"]],
  ],
  wke: [
    /* 0 */ [["timesq","hot"],["wburg","hot"],["les","hot"],["meatpk","warm"],["astoria","cold"]],
    /* 1 */ [["timesq","hot"],["wburg","hot"],["les","hot"],["meatpk","warm"]],
    /* 2 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"]],
    /* 3 */ [["timesq","warm"],["jfk","warm"],["wburg","cold"],["les","cold"]],
    /* 4 */ [["jfk","hot"],["lga","warm"],["ewr","warm"],["timesq","cold"]],
    /* 5 */ [["jfk","hot"],["lga","hot"],["ewr","warm"],["timesq","cold"]],
    /* 6 */ [["jfk","warm"],["lga","warm"],["timesq","cold"],["midtown","cold"]],
    /* 7 */ [["jfk","warm"],["lga","warm"],["midtown","cold"],["timesq","cold"]],
    /* 8 */ [["jfk","warm"],["lga","warm"],["midtown","cold"],["bklyn","cold"]],
    /* 9 */ [["jfk","warm"],["midtown","warm"],["timesq","warm"],["bklyn","cold"]],
    /* 10 */ [["timesq","hot"],["midtown","warm"],["bklyn","warm"],["ues","cold"]],
    /* 11 */ [["timesq","hot"],["midtown","warm"],["bklyn","warm"],["ues","cold"]],
    /* 12 */ [["timesq","hot"],["midtown","warm"],["bklyn","warm"],["ues","warm"],["wburg","cold"]],
    /* 13 */ [["timesq","hot"],["midtown","warm"],["ues","warm"],["bklyn","warm"],["wburg","cold"]],
    /* 14 */ [["timesq","hot"],["midtown","warm"],["ues","warm"],["wburg","cold"],["bklyn","cold"]],
    /* 15 */ [["timesq","hot"],["midtown","warm"],["ues","warm"],["wburg","warm"],["jfk","cold"]],
    /* 16 */ [["timesq","hot"],["wburg","warm"],["midtown","warm"],["ues","warm"],["bklyn","cold"]],
    /* 17 */ [["timesq","hot"],["wburg","warm"],["midtown","warm"],["les","cold"],["jfk","cold"]],
    /* 18 */ [["timesq","hot"],["wburg","hot"],["midtown","warm"],["les","warm"],["meatpk","cold"]],
    /* 19 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"],["midtown","cold"]],
    /* 20 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"],["astoria","cold"]],
    /* 21 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"],["astoria","cold"]],
    /* 22 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"]],
    /* 23 */ [["timesq","hot"],["wburg","hot"],["les","hot"],["meatpk","warm"],["astoria","cold"]],
  ],
};

export interface DemandZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heat: ZoneHeat;
  km: number | null;
}

/** Recommended zones for the current hour × day type, hot→cold then by GPS distance. */
export function computeDemandZones(hour: number, dow: number, lat: number | null, lng: number | null): DemandZone[] {
  const dtype: "wkd" | "wke" = dow === 0 || dow === 6 ? "wke" : "wkd";
  const list = NYC_HOURLY_DEMAND[dtype][hour] ?? [];
  const heatOrder: Record<ZoneHeat, number> = { hot: 0, warm: 1, cold: 2 };
  return list
    .map(([id, heat]) => {
      const zone = NYC_DEMAND_ZONES_DEF.find((z) => z.id === id)!;
      const km = lat !== null && lng !== null ? haversineKm(lat, lng, zone.lat, zone.lng) : null;
      return { id: zone.id, name: zone.name, lat: zone.lat, lng: zone.lng, heat, km };
    })
    .sort((a, b) => {
      const hd = heatOrder[a.heat] - heatOrder[b.heat];
      if (hd !== 0) return hd;
      if (a.km !== null && b.km !== null) return a.km - b.km;
      return 0;
    })
    .slice(0, 5);
}
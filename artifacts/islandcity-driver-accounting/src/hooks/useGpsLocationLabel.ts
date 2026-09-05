// ── IslandCity · GPS status label hook (header live indicator) ────────
// Subscribes to useLocation().state.currentPosition and throttles reverse
// geocoding (TomTom / Nominatim via mileage.reverseGeocode) so we don't
// burn rate limit. Returns street + city for the header pill.

import { useEffect, useState, useRef } from "react";
import { useLocation } from "./useLocation";
import { reverseGeocode } from "../lib/mileage";

export interface GpsLabel {
  street: string | null;     // "82-02 82nd Ave"
  city: string | null;       // "Elmhurst" or "Queens"
  isActive: boolean;
  hasFix: boolean;
  error: string | null;
  accuracy: number | null;
}

const THROTTLE_MS = 8000;     // max 1 geocode every 8s

export function useGpsLocationLabel(): GpsLabel {
  const { state, startTracking, stopTracking } = useLocation();
  const lastFetchAt = useRef(0);
  const lastLat = useRef<number | null>(null);
  const lastLng = useRef<number | null>(null);
  const [label, setLabel] = useState<GpsLabel>({
    street: null,
    city: null,
    isActive: state.isTracking,
    hasFix: state.currentPosition != null,
    error: state.error,
    accuracy: state.accuracy,
  });

  useEffect(() => {
    const cleanup = startTracking();
    return () => {
      cleanup?.();
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  useEffect(() => {
    const pos = state.currentPosition;
    if (!pos) return;
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;
    if (accuracy > 80) return;        // GPS too poor — don't burn geocoding
    const now = Date.now();
    if (now - lastFetchAt.current < THROTTLE_MS) return;
    if (lastLat.current != null && Math.abs(lat - lastLat.current) < 0.0005 &&
        lastLng.current != null && Math.abs(lng - lastLng.current) < 0.0005) return;
    lastFetchAt.current = now;
    lastLat.current = lat;
    lastLng.current = lng;
    reverseGeocode(lat, lng).then((res) => {
      if (!res) return;
      setLabel({
        street: extractStreet(res.address),
        city: res.city || null,
        isActive: state.isTracking,
        hasFix: true,
        error: null,
        accuracy,
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPosition, state.isTracking, state.accuracy]);

  return {
    ...label,
    isActive: state.isTracking,
    error: state.error,
  };
}

function extractStreet(full: string): string | null {
  if (!full) return null;
  return full.split(",")[0]?.trim() || null;
}

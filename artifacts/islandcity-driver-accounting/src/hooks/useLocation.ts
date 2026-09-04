// ── IslandCity Tip Tracker · location tracking hook ──────────────────
// Spec DOC: LOGICA COMPLETA MILLAS LIGADAS GPS + BREAK/LUNCH

import { useState, useCallback } from 'react';
import { GPSPoint, reverseGeocode } from '../lib/mileage';

export interface LocationState {
  currentPosition: GeolocationPosition | null;
  error: string | null;
  accuracy: number | null;
  isTracking: boolean;
  polyline: GPSPoint[];
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    currentPosition: null,
    error: null,
    accuracy: null,
    isTracking: false,
    polyline: []
  });

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: "Geolocation not supported", isTracking: false }));
      return;
    }

    if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
      (navigator as any).permissions.query({ name: "geolocation" }).then((p: any) => {
        if (p.state === "denied") {
          setState(s => ({ ...s, error: "Permission denied", isTracking: false }));
        }
      }).catch(() => {});
    }

    setState(s => ({ ...s, isTracking: true, error: null }));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState(s => ({
          ...s,
          currentPosition: pos,
          accuracy: pos.coords.accuracy,
          isTracking: true,
          error: null,
        }));
      },
      (err) => {
        setState(s => ({
          ...s,
          isTracking: s.currentPosition != null,
          error: err.code === 1 ? "Permission denied" : err.message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const getCurrentLocation = useCallback((): Promise<GPSPoint> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const geoData = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            const point: GPSPoint = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString(),
              address: geoData.address,
              businessName: geoData.businessName,
              placeType: geoData.placeType
            };
            setState(s => ({ 
              ...s, 
              polyline: [...s.polyline, point]
            }));
            resolve(point);
          } catch (e) {
            reject(e);
          }
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }, []);

  const stopTracking = useCallback(() => {
    setState(s => ({ ...s, isTracking: false }));
  }, []);

  return {
    state,
    startTracking,
    getCurrentLocation,
    stopTracking
  };
}

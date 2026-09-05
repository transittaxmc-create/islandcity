// ── IslandCity Tip Tracker · location tracking hook ──────────────────
// Spec DOC: LOGICA COMPLETA MILLAS LIGADAS GPS + BREAK/LUNCH

import { useState, useCallback, useRef } from 'react';
import { GPSPoint } from '../lib/mileage';

export interface LocationState {
  currentPosition: GeolocationPosition | null;
  error: string | null;
  accuracy: number | null;
  isTracking: boolean;
  polyline: GPSPoint[];
}

export function useLocation() {
  const watchIdRef = useRef<number | null>(null);
  const initialFixTimeoutRef = useRef<number | null>(null);
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

    if (initialFixTimeoutRef.current !== null) window.clearTimeout(initialFixTimeoutRef.current);
    initialFixTimeoutRef.current = window.setTimeout(() => {
      setState(s => s.currentPosition ? s : { ...s, isTracking: false, error: "Location timeout" });
      initialFixTimeoutRef.current = null;
    }, 15000);

    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (initialFixTimeoutRef.current !== null) {
          window.clearTimeout(initialFixTimeoutRef.current);
          initialFixTimeoutRef.current = null;
        }
        setState(s => ({
          ...s,
          currentPosition: pos,
          accuracy: pos.coords.accuracy,
          isTracking: true,
          error: null,
        }));
      },
      (err) => {
        if (initialFixTimeoutRef.current !== null) {
          window.clearTimeout(initialFixTimeoutRef.current);
          initialFixTimeoutRef.current = null;
        }
        setState(s => ({
          ...s,
          isTracking: s.currentPosition != null,
          error: err.code === 1 ? "Permission denied" : err.message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (watchIdRef.current === watchId) watchIdRef.current = null;
      if (initialFixTimeoutRef.current !== null) {
        window.clearTimeout(initialFixTimeoutRef.current);
        initialFixTimeoutRef.current = null;
      }
    };
  }, []);

  const getCurrentLocation = useCallback((): Promise<GPSPoint> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const point: GPSPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
            address: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
            businessName: "",
            placeType: "other",
          };
          setState(s => ({
            ...s,
            currentPosition: pos,
            accuracy: pos.coords.accuracy,
            error: null,
            polyline: [...s.polyline, point],
          }));
          resolve(point);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (initialFixTimeoutRef.current !== null) {
      window.clearTimeout(initialFixTimeoutRef.current);
      initialFixTimeoutRef.current = null;
    }
    setState(s => ({ ...s, isTracking: false }));
  }, []);

  return {
    state,
    startTracking,
    getCurrentLocation,
    stopTracking
  };
}
